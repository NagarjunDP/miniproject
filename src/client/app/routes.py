import os
import time
import json
from flask import jsonify, request
from flask_login import current_user, login_user, logout_user, login_required
from werkzeug.utils import secure_filename
from app import app, db, gpg
from app.models import User, ArenaTransaction, Vote
from app.file_handler import file_hash, file_signature, signature_key
from app.block_api import add_to_chain, chain_search_file

ARENA_VOTE_DURATION = 15  # seconds for consensus vote window
STAKE_PER_VOTE = 5       # tokens staked per vote

# ---------------------------------------------------------------------------
# Cybersecurity Risk Engine
# ---------------------------------------------------------------------------
DANGEROUS_KEYWORDS = ['malware', 'virus', 'hack', 'ransomware', 'trojan', 'keylogger', 'exploit']
SUSPICIOUS_EXTENSIONS = ['.exe', '.bat', '.sh', '.scr', '.vbs', '.msi', '.cmd', '.pdf']
SUSPICIOUS_EXTENSIONS_SCORE = 65  # forced into arena

def calculate_risk_score(file_name, file_size, file_hash_str):
    score = 100
    checks = {
        'hash_integrity': True,
        'signature_valid': True,
        'no_tamper': True,
        'duplicate': False,
    }

    # Check 1: Duplicate detection
    existing = ArenaTransaction.query.filter_by(file_hash=file_hash_str).first()
    if existing:
        checks['duplicate'] = True
        score -= 40

    # Check 2: Dangerous keyword in filename
    name_lower = file_name.lower()
    for kw in DANGEROUS_KEYWORDS:
        if kw in name_lower:
            score = 20  # Hard dangerous
            checks['hash_integrity'] = False
            break

    # Check 3: Suspicious extension
    _, ext = os.path.splitext(file_name)
    if ext.lower() in SUSPICIOUS_EXTENSIONS:
        score = min(score, SUSPICIOUS_EXTENSIONS_SCORE)

    # Check 4: Very small file (could be a test attack)
    if file_size < 10:
        score = min(score, 60)

    # Clamp to 0-100
    score = max(0, min(100, score))

    # Risk level
    if score > 85:
        risk_level = 'Safe'
    elif score >= 50:
        risk_level = 'Suspicious'
    else:
        risk_level = 'Dangerous'

    return score, risk_level, checks


# ---------------------------------------------------------------------------
# AUTH ENDPOINTS
# ---------------------------------------------------------------------------

@app.route('/api/v1/auth/me', methods=['GET'])
def get_me():
    if current_user.is_authenticated:
        accuracy = 0
        if current_user.total_votes > 0:
            accuracy = round((current_user.correct_votes / current_user.total_votes) * 100, 1)
        return jsonify({
            'id': current_user.id,
            'username': current_user.username,
            'key_fingerprint': current_user.key_fingerprint,
            'avatar': current_user.avatar(128),
            'role': current_user.role,
            'stake_balance': current_user.stake_balance,
            'total_votes': current_user.total_votes,
            'correct_votes': current_user.correct_votes,
            'reputation': current_user.reputation,
            'accuracy': accuracy,
        }), 200
    return jsonify({'error': 'Not logged in'}), 401


@app.route('/api/v1/auth/login', methods=['POST'])
def api_login():
    if current_user.is_authenticated:
        return jsonify({'message': 'Already logged in'}), 200
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({'error': 'Missing credentials'}), 400

    user = User.query.filter_by(username=data['username']).first()
    if user is None or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid username or password'}), 401

    login_user(user, remember=data.get('remember_me', False))
    return jsonify({'message': 'Login successful', 'role': user.role}), 200


@app.route('/api/v1/auth/logout', methods=['POST'])
def api_logout():
    logout_user()
    return jsonify({'message': 'Logged out'}), 200


@app.route('/api/v1/auth/register', methods=['POST'])
def api_register():
    if current_user.is_authenticated:
        return jsonify({'error': 'Already logged in'}), 400
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data or 'email' not in data:
        return jsonify({'error': 'Missing fields'}), 400

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 400

    role = data.get('role', 'user')
    if role not in ('user', 'miner'):
        role = 'user'

    user = User(username=data['username'], email=data['email'], role=role)
    user.set_password(data['password'])
    try:
        user.set_key()
        db.session.add(user)
        db.session.commit()
        return jsonify({'message': 'Registration successful', 'role': role}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ---------------------------------------------------------------------------
# FILE ENDPOINTS (with Risk Engine)
# ---------------------------------------------------------------------------

@app.route('/api/v1/files/add', methods=['POST'])
@login_required
def api_add_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    file_name = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], file_name)
    file.save(file_path)

    try:
        file_size = os.path.getsize(file_path)
        file_hash_str = file_hash(file_name)  # also deletes temp file
        risk_score, risk_level, checks = calculate_risk_score(file_name, file_size, file_hash_str)

        result = {
            'file_name': file_name,
            'file_hash': file_hash_str,
            'risk_score': risk_score,
            'risk_level': risk_level,
            'checks': checks,
        }

        # -- DANGEROUS: Reject immediately --
        if risk_score < 50:
            result['status'] = 'rejected'
            result['message'] = 'File rejected by automated security engine.'
            return jsonify(result), 403

        # -- SUSPICIOUS: Send to Mining Arena --
        if 50 <= risk_score <= 85:
            file_sig_str = file_signature(file_hash_str, current_user.key_fingerprint)
            sign_key_str = signature_key(current_user.key_fingerprint)

            txn = ArenaTransaction(
                file_name=file_name,
                file_hash=file_hash_str,
                file_signature=file_sig_str,
                sign_key=sign_key_str,
                risk_score=risk_score,
                security_checks=json.dumps(checks),
                status='pending',
                uploader_id=current_user.id
            )
            db.session.add(txn)
            db.session.commit()

            result['status'] = 'pending_review'
            result['message'] = 'File flagged as suspicious. Sent to Cyber Mining Arena for review.'
            result['arena_id'] = txn.id
            return jsonify(result), 202

        # -- SAFE: Auto-mine immediately --
        file_sig_str = file_signature(file_hash_str, current_user.key_fingerprint)
        sign_key_str = signature_key(current_user.key_fingerprint)

        file_data = {
            'file_name': file_name,
            'file_hash': file_hash_str,
            'file_signature': file_sig_str,
            'sign_key': sign_key_str,
        }
        code, response = add_to_chain(file_data)

        result['status'] = 'mined'
        result['message'] = 'File verified and automatically mined into the blockchain.'
        result['blockchain_response'] = response
        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/v1/files/verify', methods=['POST'])
def api_verify_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    file_name = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], file_name)
    file.save(file_path)

    try:
        verify_file_hash = file_hash(file_name)
        code, response = chain_search_file(verify_file_hash)

        verify_status = False
        if code == 200:
            verify_status = bool(gpg.verify(response.get('txn', {}).get('signature', '')))

        return jsonify({
            'code': code,
            'response': response,
            'verify': verify_status,
            'hash': verify_file_hash,
        }), code
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ---------------------------------------------------------------------------
# ARENA ENDPOINTS
# ---------------------------------------------------------------------------

def _resolve_arena_txn(txn):
    """Check votes, determine consensus, apply rewards/penalties."""
    votes = Vote.query.filter_by(transaction_id=txn.id).all()
    if not votes:
        txn.status = 'rejected'
        db.session.commit()
        return

    accept_votes = [v for v in votes if v.decision == 'accept']
    reject_votes = [v for v in votes if v.decision == 'reject']
    
    winning_decision = 'accept' if len(accept_votes) >= len(reject_votes) else 'reject'
    txn.status = 'accepted' if winning_decision == 'accept' else 'rejected'

    # Mine if accepted
    if txn.status == 'accepted':
        try:
            file_data = {
                'file_name': txn.file_name,
                'file_hash': txn.file_hash,
                'file_signature': txn.file_signature,
                'sign_key': txn.sign_key,
            }
            add_to_chain(file_data)
        except Exception:
            pass

    # Reward/penalty each voter
    for vote in votes:
        miner = db.session.get(User, vote.miner_id)
        if not miner:
            continue
        miner.total_votes += 1
        if vote.decision == winning_decision:
            # Correct vote: return stake + reward (proportional to reputation)
            reward = int(15 * (miner.reputation / 100))
            miner.stake_balance += vote.staked_amount + reward
            miner.correct_votes += 1
            miner.reputation = min(100, miner.reputation + 2)
        else:
            # Wrong vote: lose stake
            miner.reputation = max(10, miner.reputation - 5)

    db.session.commit()


@app.route('/api/v1/arena/live', methods=['GET'])
def arena_live():
    now = time.time()

    # Resolve any expired voting sessions
    expired = ArenaTransaction.query.filter_by(status='voting').all()
    for txn in expired:
        if txn.voting_end_time and now > txn.voting_end_time:
            _resolve_arena_txn(txn)

    # Return all active transactions (pending + voting)
    active = ArenaTransaction.query.filter(
        ArenaTransaction.status.in_(['pending', 'voting'])
    ).all()

    result = []
    for txn in active:
        votes = Vote.query.filter_by(transaction_id=txn.id).all()
        accept_count = sum(1 for v in votes if v.decision == 'accept')
        reject_count = sum(1 for v in votes if v.decision == 'reject')
        
        # Check if current miner already voted
        my_vote = None
        if current_user.is_authenticated:
            my_vote_obj = Vote.query.filter_by(
                transaction_id=txn.id, 
                miner_id=current_user.id
            ).first()
            if my_vote_obj:
                my_vote = my_vote_obj.decision

        txn_data = txn.to_dict()
        txn_data['accept_votes'] = accept_count
        txn_data['reject_votes'] = reject_count
        txn_data['my_vote'] = my_vote
        result.append(txn_data)

    # Also return recently resolved transactions for live updates
    resolved = ArenaTransaction.query.filter(
        ArenaTransaction.status.in_(['accepted', 'rejected'])
    ).order_by(ArenaTransaction.id.desc()).limit(5).all()

    resolved_list = []
    for txn in resolved:
        votes = Vote.query.filter_by(transaction_id=txn.id).all()
        accept_count = sum(1 for v in votes if v.decision == 'accept')
        reject_count = sum(1 for v in votes if v.decision == 'reject')
        t = txn.to_dict()
        t['accept_votes'] = accept_count
        t['reject_votes'] = reject_count
        resolved_list.append(t)

    return jsonify({
        'active': result,
        'resolved': resolved_list,
    }), 200


@app.route('/api/v1/arena/vote', methods=['POST'])
@login_required
def arena_vote():
    if current_user.role != 'miner':
        return jsonify({'error': 'Only miners can vote'}), 403
    if current_user.stake_balance < STAKE_PER_VOTE:
        return jsonify({'error': 'Insufficient stake balance'}), 400

    data = request.get_json()
    if not data or 'transaction_id' not in data or 'decision' not in data:
        return jsonify({'error': 'Missing transaction_id or decision'}), 400
    if data['decision'] not in ('accept', 'reject'):
        return jsonify({'error': 'Decision must be accept or reject'}), 400

    txn = db.session.get(ArenaTransaction, int(data['transaction_id']))
    if not txn:
        return jsonify({'error': 'Transaction not found'}), 404
    if txn.status not in ('pending', 'voting'):
        return jsonify({'error': 'Transaction is no longer open for voting'}), 409

    # Check duplicate vote
    existing_vote = Vote.query.filter_by(
        transaction_id=txn.id, miner_id=current_user.id
    ).first()
    if existing_vote:
        return jsonify({'error': 'You have already voted on this transaction'}), 409

    now = time.time()

    # First vote: open voting window
    if txn.status == 'pending':
        txn.status = 'voting'
        txn.proposed_decision = data['decision']
        txn.voting_end_time = now + ARENA_VOTE_DURATION

    vote = Vote(
        transaction_id=txn.id,
        miner_id=current_user.id,
        decision=data['decision'],
        staked_amount=STAKE_PER_VOTE,
    )
    current_user.stake_balance -= STAKE_PER_VOTE

    db.session.add(vote)
    db.session.commit()

    return jsonify({
        'message': f'Vote cast: {data["decision"]}',
        'time_left': max(0, int(txn.voting_end_time - now)),
        'stake_balance': current_user.stake_balance,
    }), 200


@app.route('/api/v1/arena/leaderboard', methods=['GET'])
def arena_leaderboard():
    miners = User.query.filter_by(role='miner').all()
    board = []
    for m in miners:
        accuracy = 0
        if m.total_votes > 0:
            accuracy = round((m.correct_votes / m.total_votes) * 100, 1)
        board.append({
            'username': m.username,
            'avatar': m.avatar(32),
            'stake_balance': m.stake_balance,
            'total_votes': m.total_votes,
            'correct_votes': m.correct_votes,
            'accuracy': accuracy,
            'reputation': m.reputation,
        })
    board.sort(key=lambda x: (-x['correct_votes'], -x['accuracy']))
    return jsonify({'leaderboard': board}), 200


@app.route('/api/v1/pub_key/<key_fingerprint>', methods=['GET'])
def api_pub_key_id(key_fingerprint):
    return jsonify({'pub_key': gpg.export_keys(key_fingerprint)})


@app.route('/api/v1/pub_key/user/<username>', methods=['GET'])
def api_pub_key_username(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'pub_key': gpg.export_keys(user.key_fingerprint)})
