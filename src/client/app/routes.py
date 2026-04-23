import os
from flask import jsonify, request
from flask_login import current_user, login_user, logout_user, login_required
from werkzeug.utils import secure_filename
from app import app, db, gpg
from app.models import User
from app.file_handler import file_hash, file_signature, signature_key
from app.block_api import add_to_chain, chain_search_file

@app.route('/api/v1/auth/me', methods=['GET'])
def get_me():
    if current_user.is_authenticated:
        return jsonify({
            'username': current_user.username,
            'key_fingerprint': current_user.key_fingerprint,
            'avatar': current_user.avatar(128)
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
    return jsonify({'message': 'Login successful'}), 200

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
        
    user = User(username=data['username'], email=data['email'])
    user.set_password(data['password'])
    try:
        user.set_key()
        db.session.add(user)
        db.session.commit()
        return jsonify({'message': 'Registration successful'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/files/add', methods=['POST'])
@login_required
def api_add_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    if file:
        file_name = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], file_name)
        file.save(file_path)

        try:
            file_hash_str = file_hash(file_name)
            file_sig_str = file_signature(file_hash_str, current_user.key_fingerprint)
            sign_key_str = signature_key(current_user.key_fingerprint)

            file_data = {
                'file_name': file_name,
                'file_hash': file_hash_str,
                'file_signature': file_sig_str,
                'sign_key': sign_key_str
            }

            code, response = add_to_chain(file_data)
            return jsonify({'code': code, 'response': response, 'file_data': file_data}), code
        except Exception as e:
            return jsonify({'error': str(e)}), 500

@app.route('/api/v1/files/verify', methods=['POST'])
def api_verify_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    if file:
        file_name = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], file_name)
        file.save(file_path)
        
        try:
            verify_file_hash = file_hash(file_name)
            code, response = chain_search_file(verify_file_hash)
            
            verify_status = False
            if code == 200:
                verify_status = gpg.verify(response.get('txn').get('signature'))
                
            return jsonify({
                'code': code, 
                'response': response, 
                'verify': bool(verify_status)
            }), code
        except Exception as e:
            return jsonify({'error': str(e)}), 500

@app.route('/api/v1/pub_key/<key_fingerprint>', methods=['GET'])
def api_pub_key_id(key_fingerprint):
    return jsonify({'pub_key': gpg.export_keys(key_fingerprint)})

@app.route('/api/v1/pub_key/user/<username>', methods=['GET'])
def api_pub_key_username(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'pub_key': gpg.export_keys(user.key_fingerprint)})
