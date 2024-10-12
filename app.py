from flask import Flask, request, render_template, redirect, url_for, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import re

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///thumbnails.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Models
class Board(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    thumbnails = db.relationship('Thumbnail', backref='board', lazy=True)

class Thumbnail(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    video_id = db.Column(db.String(11), unique=True, nullable=False)
    thumbnail_url = db.Column(db.String(255), nullable=False)
    board_id = db.Column(db.Integer, db.ForeignKey('board.id'), nullable=False)

# Routes
@app.route('/', methods=['GET', 'POST'])
def index():
    boards = Board.query.all()
    active_board = Board.query.first()  # Load the first board by default

    if request.method == 'POST':
        youtube_link = request.form.get('youtube_link')
        video_id = extract_video_id(youtube_link)
        if video_id and active_board:
            thumbnail_url = f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
            if not Thumbnail.query.filter_by(video_id=video_id, board_id=active_board.id).first():
                new_thumbnail = Thumbnail(video_id=video_id, thumbnail_url=thumbnail_url, board=active_board)
                db.session.add(new_thumbnail)
                db.session.commit()
        return redirect(url_for('index'))

    thumbnails = Thumbnail.query.filter_by(board_id=active_board.id).all() if active_board else []
    return render_template('index.html', thumbnails=thumbnails, boards=boards, active_board=active_board)

@app.route('/new_board', methods=['POST'])
def new_board():
    board_name = f"Board {Board.query.count() + 1}"  # Give the board a default name
    new_board = Board(name=board_name)
    db.session.add(new_board)
    db.session.commit()
    return redirect(url_for('index'))

@app.route('/switch_board/<int:board_id>', methods=['GET'])
def switch_board(board_id):
    boards = Board.query.all()
    active_board = Board.query.get_or_404(board_id)
    thumbnails = Thumbnail.query.filter_by(board_id=active_board.id).all()
    return render_template('index.html', thumbnails=thumbnails, boards=boards, active_board=active_board)

# New API routes for the Chrome extension
@app.route('/api/boards', methods=['GET'])
def get_boards():
    boards = Board.query.all()
    return jsonify([{'id': board.id, 'name': board.name} for board in boards])

@app.route('/api/save_thumbnail', methods=['POST'])
def save_thumbnail():
    data = request.json
    video_id = data.get('video_id')
    board_id = data.get('board_id')

    if not video_id or not board_id:
        return jsonify({'success': False, 'error': 'Missing video_id or board_id'}), 400

    board = Board.query.get(board_id)
    if not board:
        return jsonify({'success': False, 'error': 'Invalid board_id'}), 400

    existing_thumbnail = Thumbnail.query.filter_by(video_id=video_id, board_id=board_id).first()
    if existing_thumbnail:
        return jsonify({'success': False, 'error': 'Thumbnail already exists in this board'}), 400

    thumbnail_url = f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
    new_thumbnail = Thumbnail(video_id=video_id, thumbnail_url=thumbnail_url, board=board)
    db.session.add(new_thumbnail)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Thumbnail saved successfully'})

def extract_video_id(url):
    regex = r"(?:v=|\/)([0-9A-Za-z_-]{11}).*"
    match = re.search(regex, url)
    return match.group(1) if match else None

if __name__ == '__main__':
    app.run(debug=True)
