from flask import Blueprint
from flask_socketio import emit, join_room, leave_room, disconnect
from flask_jwt_extended import jwt_required, get_jwt_identity, decode_token
from functools import wraps

from app import socketio
from app.models import User

# 创建WebSocket蓝图
websocket_bp = Blueprint('websocket', __name__)

# 存储活跃连接
active_connections = {}


def authenticated_only(f):
    """WebSocket认证装饰器"""
    @wraps(f)
    def wrapped(*args, **kwargs):
        try:
            # 从查询参数获取token
            from flask import request
            token = request.args.get('token')
            if not token:
                disconnect()
                return False
            
            # 验证token
            decoded_token = decode_token(token)
            user_id = decoded_token['sub']
            
            # 获取用户信息
            user = User.query.get(user_id)
            if not user or not user.is_active:
                disconnect()
                return False
            
            return f(user, *args, **kwargs)
            
        except Exception as e:
            print(f"WebSocket authentication error: {e}")
            disconnect()
            return False
    
    return wrapped


@socketio.on('connect')
@authenticated_only
def handle_connect(user):
    """处理客户端连接"""
    from flask import request
    
    session_id = request.sid
    user_id = user.id
    
    # 记录连接
    active_connections[session_id] = {
        'user_id': user_id,
        'username': user.username,
        'connected_at': datetime.utcnow().isoformat()
    }
    
    # 加入用户房间
    join_room(f'user_{user_id}')
    
    # 如果是管理员，加入管理员房间
    if user.role == 'admin':
        join_room('admin')
    
    print(f"User {user.username} connected with session {session_id}")
    
    # 发送连接成功消息
    emit('connected', {
        'message': 'Connected successfully',
        'user': user.to_dict()
    })
    
    # 广播用户上线消息给管理员
    emit('user_online', {
        'user_id': user_id,
        'username': user.username
    }, room='admin')


@socketio.on('disconnect')
def handle_disconnect():
    """处理客户端断开连接"""
    from flask import request
    
    session_id = request.sid
    
    if session_id in active_connections:
        user_info = active_connections[session_id]
        user_id = user_info['user_id']
        username = user_info['username']
        
        # 离开房间
        leave_room(f'user_{user_id}')
        leave_room('admin')
        
        # 移除连接记录
        del active_connections[session_id]
        
        print(f"User {username} disconnected")
        
        # 广播用户下线消息给管理员
        emit('user_offline', {
            'user_id': user_id,
            'username': username
        }, room='admin')


@socketio.on('join_task_room')
@authenticated_only
def handle_join_task_room(user, data):
    """加入任务房间以接收任务更新"""
    task_id = data.get('task_id')
    if task_id:
        join_room(f'task_{task_id}')
        emit('joined_task_room', {'task_id': task_id})


@socketio.on('leave_task_room')
@authenticated_only
def handle_leave_task_room(user, data):
    """离开任务房间"""
    task_id = data.get('task_id')
    if task_id:
        leave_room(f'task_{task_id}')
        emit('left_task_room', {'task_id': task_id})


@socketio.on('subscribe_host_status')
@authenticated_only
def handle_subscribe_host_status(user, data):
    """订阅主机状态更新"""
    host_ids = data.get('host_ids', [])
    
    for host_id in host_ids:
        join_room(f'host_{host_id}')
    
    emit('subscribed_host_status', {'host_ids': host_ids})


@socketio.on('unsubscribe_host_status')
@authenticated_only
def handle_unsubscribe_host_status(user, data):
    """取消订阅主机状态更新"""
    host_ids = data.get('host_ids', [])
    
    for host_id in host_ids:
        leave_room(f'host_{host_id}')
    
    emit('unsubscribed_host_status', {'host_ids': host_ids})


@socketio.on('get_active_users')
@authenticated_only
def handle_get_active_users(user):
    """获取活跃用户列表（仅管理员）"""
    if user.role != 'admin':
        emit('error', {'message': 'Permission denied'})
        return
    
    active_users = []
    for session_id, conn_info in active_connections.items():
        active_users.append({
            'session_id': session_id,
            'user_id': conn_info['user_id'],
            'username': conn_info['username'],
            'connected_at': conn_info['connected_at']
        })
    
    emit('active_users', {'users': active_users})


@socketio.on('broadcast_message')
@authenticated_only
def handle_broadcast_message(user, data):
    """广播消息（仅管理员）"""
    if user.role != 'admin':
        emit('error', {'message': 'Permission denied'})
        return
    
    message = data.get('message')
    message_type = data.get('type', 'info')
    target = data.get('target', 'all')  # all, admin, user_id
    
    broadcast_data = {
        'type': 'system_message',
        'message': message,
        'message_type': message_type,
        'from_user': user.username,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    if target == 'all':
        emit('system_message', broadcast_data, broadcast=True)
    elif target == 'admin':
        emit('system_message', broadcast_data, room='admin')
    elif target.startswith('user_'):
        emit('system_message', broadcast_data, room=target)
    
    emit('message_sent', {'status': 'success'})


# 导入事件处理函数
from app.websocket.events import *