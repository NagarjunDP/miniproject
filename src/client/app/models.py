import time
from app import db, login, gpg
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from hashlib import md5

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True)
    email = db.Column(db.String(120), index=True, unique=True)
    password_hash = db.Column(db.String(128))
    key_fingerprint = db.Column(db.String(60), unique=True)
    
    # Role-based system
    role = db.Column(db.String(20), default='user') # 'user' or 'miner'
    
    # Miner stats
    stake_balance = db.Column(db.Integer, default=1000)
    total_votes = db.Column(db.Integer, default=0)
    correct_votes = db.Column(db.Integer, default=0)
    reputation = db.Column(db.Integer, default=100)

    def __repr__(self):
        return '<User {}>'.format(self.username)

    # Password utils
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    # GPG key
    def set_key(self, key_length=1024):
        self.key_fingerprint = self._gen_key(key_length).fingerprint

    def _gen_key(self, key_length):
        batch_key_input = gpg.gen_key_input(
            name_real=self.username,
            name_email=self.email,
            key_type='RSA',
            key_length=key_length,
            no_protection=True)
        return gpg.gen_key(batch_key_input)

    # Gravatar logic
    def avatar(self, size):
        digest = md5(self.email.lower().encode('utf-8')).hexdigest()
        return 'https://www.gravatar.com/avatar/{}?d=identicon&s={}'.format(
            digest, size)

class ArenaTransaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    file_name = db.Column(db.String(120))
    file_hash = db.Column(db.String(100))
    file_signature = db.Column(db.String(500))
    sign_key = db.Column(db.String(500))
    risk_score = db.Column(db.Integer)
    
    status = db.Column(db.String(20), default='pending') # pending, voting, accepted, rejected
    voting_end_time = db.Column(db.Float, nullable=True) # timestamp
    proposed_decision = db.Column(db.String(10), nullable=True) # 'accept' or 'reject'
    uploader_id = db.Column(db.Integer, db.ForeignKey('user.id'))

    def to_dict(self):
        return {
            'id': self.id,
            'file_name': self.file_name,
            'file_hash': self.file_hash,
            'risk_score': self.risk_score,
            'status': self.status,
            'voting_end_time': self.voting_end_time,
            'proposed_decision': self.proposed_decision,
            'time_left': max(0, int(self.voting_end_time - time.time())) if self.voting_end_time else 0
        }

class Vote(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(db.Integer, db.ForeignKey('arena_transaction.id'))
    miner_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    decision = db.Column(db.String(10)) # 'accept' or 'reject'
    staked_amount = db.Column(db.Integer, default=5)

@login.user_loader
def load_user(id):
    return db.session.get(User, int(id))
