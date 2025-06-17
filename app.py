from flask import Flask, request, send_file, jsonify, send_from_directory
import os
import shutil
import sys
from threading import Thread
from flask_cors import CORS
import zipfile
import io
import re
from docx2pdf import convert  # 导入 python-docx2pdf
import pythoncom
sys.path.append('.')
from modules.pdf_image_processor import process_pdf  # PDF转图片再转文字处理
from werkzeug.utils import secure_filename
from modules.document_interpretation import get_file_extractor, process_single_document_with_name
import time
import threading
import json
# 视频处理相关导入
import whisper
import yaml
import logging

# 全局锁，确保Whisper模型不会被并发访问
whisper_lock = threading.Lock()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# 基础目录配置
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# 创建统一的文件存储区
STORAGE_ROOT = os.path.join(BASE_DIR, '文件存储区')
TEMP_DIR = os.path.join(STORAGE_ROOT, '用户上传文件')  # 用户上传的原始文件
OUTPUT_DIR = os.path.join(STORAGE_ROOT, '临时处理文件')  # 处理过程中的临时文件
BACKUP_DIR = os.path.join(STORAGE_ROOT, '用户处理结果')  # 用户的最终处理结果

# 确保基础目录存在
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(BACKUP_DIR, exist_ok=True)

def get_user_dirs(ip, service_type):
    """
    获取用户特定服务的目录
    service_type: 'pdf_parse', 'pdf_reader', 'video'
    """
    # 为每个服务类型创建子目录
    temp_service_dir = os.path.join(TEMP_DIR, service_type, ip)
    output_service_dir = os.path.join(OUTPUT_DIR, service_type, ip)
    backup_service_dir = os.path.join(BACKUP_DIR, service_type, ip)
    
    # 确保目录存在
    os.makedirs(temp_service_dir, exist_ok=True)
    os.makedirs(output_service_dir, exist_ok=True)
    os.makedirs(backup_service_dir, exist_ok=True)
    
    return temp_service_dir, output_service_dir, backup_service_dir

# 为每个IP保存取消标志和进度
ip_states = {}

# 配置上传文件的目录 - 使用动态路径构建
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'my-react-app', 'public', 'uploads')
AI_NEWS_FOLDER = os.path.join(BASE_DIR, 'my-react-app', 'public', 'ai_news_pdfs')

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
# 移除文件大小限制，按照front_back的实现
# app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max-limit

# 确保上传目录存在
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(AI_NEWS_FOLDER, exist_ok=True)
# 文件存储区目录已在上面创建，这里不需要重复创建

# 允许的文件类型
ALLOWED_EXTENSIONS = {'pdf'}

# 允许的视频文件类型
def allowed_video_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# 存储处理进度的全局变量
processing_status = {
    'current_file': '',
    'current_page': 0,
    'total_pages': 0,
    'status': '等待上传'
}

# def get_real_ip():
#     """获取用户真实的IPv4地址"""
#     try:
#         import socket
#         # 连接到外部服务器来获取本机的外网IP
#         with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
#             # 使用Google的DNS服务器8.8.8.8来获取本机IP
#             s.connect(("8.8.8.8", 80))
#             real_ip = s.getsockname()[0]
#             return real_ip
#     except Exception as e:
#         # 如果获取失败，尝试获取本地IP
#         try:
#             hostname = socket.gethostname()
#             local_ip = socket.gethostbyname(hostname)
#             # 避免返回127.0.0.1
#             if local_ip != "127.0.0.1":
#                 return local_ip
#         except:
#             pass
#         # 最后的备选方案：使用request.remote_addr
#         return request.remote_addr if hasattr(request, 'remote_addr') else "default_user"
def get_real_ip():
    """获取用户真实的客户端IP地址"""
    try:
        # 优先检查代理头部（适用于负载均衡和反向代理）
        if request.headers.get('X-Forwarded-For'):
            # X-Forwarded-For 可能包含多个IP，取第一个（真实客户端IP）
            forwarded_ips = request.headers.get('X-Forwarded-For').split(',')
            client_ip = forwarded_ips[0].strip()
            if client_ip and client_ip != '127.0.0.1' and not client_ip.startswith('::'):
                logging.info(f"从 X-Forwarded-For 获取客户端IP: {client_ip}")
                return client_ip

        # 检查其他常见的代理头部
        if request.headers.get('X-Real-IP'):
            real_ip = request.headers.get('X-Real-IP').strip()
            if real_ip and real_ip != '127.0.0.1' and not real_ip.startswith('::'):
                logging.info(f"从 X-Real-IP 获取客户端IP: {real_ip}")
                return real_ip

        # 检查 Cloudflare 的IP头部
        if request.headers.get('CF-Connecting-IP'):
            cf_ip = request.headers.get('CF-Connecting-IP').strip()
            if cf_ip and cf_ip != '127.0.0.1' and not cf_ip.startswith('::'):
                logging.info(f"从 CF-Connecting-IP 获取客户端IP: {cf_ip}")
                return cf_ip

        # 使用Flask的remote_addr（直接连接的客户端IP）
        if hasattr(request, 'remote_addr') and request.remote_addr:
            if request.remote_addr != '127.0.0.1' and not request.remote_addr.startswith('::'):
                logging.info(f"从 request.remote_addr 获取客户端IP: {request.remote_addr}")
                return request.remote_addr

        # 最后的备选方案 - 使用默认用户标识
        logging.warning("无法获取有效的客户端IP，使用默认用户标识")
        return 'default_user'

    except Exception as e:
        logging.error(f"获取客户端IP失败: {str(e)}")
        return 'default_user'

@app.route('/upload', methods=['POST'])
def upload_files():
    client_ip = get_real_ip()
    if client_ip not in ip_states:
        ip_states[client_ip] = {
            'is_canceling': False,
            'progress': {'current': 0, 'total': 0, 'currentFile': '', 'status': '等待处理'},
            'total_files': 0,
            'processed_files': 0
        }
    ip_states[client_ip]['is_canceling'] = False  # 重置取消标志

    files = request.files.getlist('file')
    if not files:
        return jsonify({'error': '没有文件上传'}), 400

    temp_dir, output_dir, _ = get_user_dirs(client_ip, 'pdf_parse')

    # 初始化进度为0/0
    ip_states[client_ip]['progress']['current'] = 0
    ip_states[client_ip]['progress']['total'] = 0
    ip_states[client_ip]['total_files'] = len(files)
    ip_states[client_ip]['processed_files'] = 0

    for file in files:
        if not allowed_file(file.filename):
            return jsonify({'error': f'不支持的文件类型: {file.filename}'}), 400
        file_path = os.path.join(temp_dir, file.filename)
        file.save(file_path)
        Thread(target=process_pdf_with_cancel_check, args=(client_ip, file_path, output_dir)).start()

    return jsonify({'message': '文件上传成功，开始处理', 'total_files': len(files)}), 200

def process_pdf_with_cancel_check(ip, pdf_path, temp_output_dir):
    pythoncom.CoInitialize()  # 初始化COM库
    try:
        _, _, persistent_output_dir = get_user_dirs(ip, 'pdf_parse')
        pdf_filename = os.path.basename(pdf_path)
        base_name = os.path.splitext(pdf_filename)[0]
        
        # 更新处理状态
        ip_states[ip]['progress'].update({
            'currentFile': pdf_filename,
            'status': '正在处理'
        })
        
        while not ip_states[ip]['is_canceling']:
            # 传递进度字典给 process_pdf
            results = process_pdf(pdf_path, temp_output_dir, ip_states[ip]['progress'])
            if not ip_states[ip]['is_canceling']:
                # 解析成功后将当前文件的相关文件从临时文件夹移动到持久文件夹
                move_files_to_persistent(temp_output_dir, persistent_output_dir, base_name)
                ip_states[ip]['processed_files'] += 1
                if ip_states[ip]['processed_files'] == ip_states[ip]['total_files']:
                    # 更新状态为已完成
                    ip_states[ip]['progress'].update({
                        'status': '已完成',
                        'current': ip_states[ip]['progress']['total'],
                        'currentFile': ''
                    })
                    # 重置处理计数
                    ip_states[ip]['total_files'] = 0
                    ip_states[ip]['processed_files'] = 0
            break
        if ip_states[ip]['is_canceling']:
            # 清除临时文件
            if os.path.exists(pdf_path):
                os.remove(pdf_path)
            clear_temp_directory(temp_output_dir)
            # 更新状态为已取消
            ip_states[ip]['progress'].update({
                'status': '已取消',
                'current': 0,
                'total': 0,
                'currentFile': ''
            })
        return results
    finally:
        pythoncom.CoUninitialize()  # 释放COM库

def move_files_to_persistent(temp_output_dir, persistent_output_dir, base_name):
    for root, dirs, files in os.walk(temp_output_dir):
        for file in files:
            if base_name in file:
                temp_file_path = os.path.join(root, file)
                relative_path = os.path.relpath(temp_file_path, temp_output_dir)
                persistent_file_path = os.path.join(persistent_output_dir, relative_path)
                persistent_file_dir = os.path.dirname(persistent_file_path)
                os.makedirs(persistent_file_dir, exist_ok=True)
                shutil.move(temp_file_path, persistent_file_path)

def clear_temp_directory(temp_output_dir):
    if os.path.exists(temp_output_dir):
        for root, dirs, files in os.walk(temp_output_dir):
            for file in files:
                file_path = os.path.join(root, file)
                try:
                    os.remove(file_path)
                except Exception as e:
                    logging.error(f"删除临时文件失败: {str(e)}")
            for dir in dirs:
                dir_path = os.path.join(root, dir)
                try:
                    shutil.rmtree(dir_path)
                except Exception as e:
                    logging.error(f"删除临时目录失败: {str(e)}")

@app.route('/progress')
def get_progress():
    client_ip = get_real_ip()
    if client_ip in ip_states:
        return jsonify(ip_states[client_ip]['progress'])
    return jsonify({'current': 0, 'total': 0, 'currentFile': '', 'status': '等待处理'})

@app.route('/download/<path:filename>')
def download_file(filename):
    client_ip = get_real_ip()
    _, _, persistent_output_dir = get_user_dirs(client_ip, 'pdf_parse')
    file_path = os.path.join(persistent_output_dir, filename)
    return send_file(file_path, as_attachment=True)

@app.route('/download-links')
def get_download_links():
    client_ip = get_real_ip()
    _, _, persistent_output_dir = get_user_dirs(client_ip, 'pdf_parse')
    links = []
    for root, dirs, files in os.walk(persistent_output_dir):
        for file in files:
            links.append(file)
    return jsonify(links)

@app.route('/detailed-progress')
def get_detailed_progress():
    client_ip = get_real_ip()
    if client_ip in ip_states:
        progress = ip_states[client_ip]['progress']
        # 如果状态是"已取消"，重置所有状态
        if progress.get('status') == '已取消':
            ip_states[client_ip]['progress'] = {
                'current': 0,
                'total': 0,
                'currentFile': '',
                'status': '等待处理'
            }
            ip_states[client_ip]['total_files'] = 0
            ip_states[client_ip]['processed_files'] = 0
            return jsonify({
                'currentFile': '',
                'currentPage': 0,
                'totalPages': 0,
                'status': '等待处理'
            })
        return jsonify({
            'currentFile': progress.get('currentFile', ''),
            'currentPage': progress.get('current', 0),
            'totalPages': progress.get('total', 0),
            'status': progress.get('status', '等待处理')
        })
    return jsonify({
        'currentFile': '',
        'currentPage': 0,
        'totalPages': 0,
        'status': '等待处理'
    })

@app.route('/batch-download')
def batch_download():
    client_ip = get_real_ip()
    _, _, persistent_output_dir = get_user_dirs(client_ip, 'pdf_parse')
    import zipfile
    import io
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for root, dirs, files in os.walk(persistent_output_dir):
            for file in files:
                file_path = os.path.join(root, file)
                zip_file.write(file_path, os.path.relpath(file_path, persistent_output_dir))
    
    zip_buffer.seek(0)
    return send_file(
        zip_buffer,
        mimetype='application/zip',
        as_attachment=True,
        download_name='processed_files.zip'
    )

@app.route('/cancel', methods=['POST'])
def cancel_processing():
    client_ip = get_real_ip()
    if client_ip in ip_states:
        # 标记为取消
        ip_states[client_ip]['is_canceling'] = True
        # 重置所有状态
        ip_states[client_ip]['progress'] = {
            'current': 0,
            'total': 0,
            'currentFile': '',
            'status': '等待处理'
        }
        ip_states[client_ip]['total_files'] = 0
        ip_states[client_ip]['processed_files'] = 0

        # 清除临时文件
        temp_dir, output_dir, _ = get_user_dirs(client_ip, 'pdf_parse')
        clear_temp_directory(output_dir)
        clear_temp_directory(temp_dir)

        return jsonify({'message': '处理已取消'}), 200
    return jsonify({'error': '没有正在进行的处理'}), 400

@app.route('/parsed-files')
def get_parsed_files():
    client_ip = get_real_ip()
    _, _, persistent_output_dir = get_user_dirs(client_ip, 'pdf_parse')
    parsed_files = set()
    for root, dirs, files in os.walk(persistent_output_dir):
        for file in files:
            if '_extracted' in file or '_page_' in file:
                # 提取原始的 PDF 文件名
                base_name = file.split('_extracted')[0].split('_page_')[0]
                parsed_files.add(f'{base_name}.pdf')
    return jsonify(list(parsed_files))

import re

@app.route('/delete/<path:filename>', methods=['DELETE'])
def delete_files(filename):
    client_ip = get_real_ip()
    _, _, persistent_output_dir = get_user_dirs(client_ip, 'pdf_parse')
    base_name = os.path.splitext(filename)[0]
    pattern = re.compile(rf'^{base_name}(_extracted|_page_).*')
    for root, dirs, files in os.walk(persistent_output_dir):
        for file in files:
            if pattern.match(file):
                file_path = os.path.join(root, file)
                os.remove(file_path)
    return jsonify({'message': '文件删除成功'}), 200

@app.route('/download-single/<path:filename>')
def download_single_file(filename):
    client_ip = get_real_ip()
    _, _, persistent_output_dir = get_user_dirs(client_ip, 'pdf_parse')
    base_name = os.path.splitext(filename)[0]
    pattern = re.compile(rf'^{base_name}(_extracted|_page_).*')
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for root, dirs, files in os.walk(persistent_output_dir):
            for file in files:
                if pattern.match(file):
                    file_path = os.path.join(root, file)
                    zip_file.write(file_path, os.path.relpath(file_path, persistent_output_dir))
    zip_buffer.seek(0)
    return send_file(
        zip_buffer,
        mimetype='application/zip',
        as_attachment=True,
        download_name=f'{base_name}_files.zip'
    )

@app.route('/preview/<path:filename>')
def preview_file(filename):
    client_ip = get_real_ip()
    _, _, persistent_output_dir = get_user_dirs(client_ip, 'pdf_parse')
    base_name = os.path.splitext(filename)[0]
    docx_path = os.path.join(persistent_output_dir, f"{base_name}_extracted.docx")

    if not os.path.exists(docx_path):
        return jsonify({'error': 'DOCX文件未找到'}), 404

    pdf_path = os.path.join(persistent_output_dir, f"{base_name}_extracted.pdf")

    try:
        if not os.path.exists(pdf_path):
            pythoncom.CoInitialize()  # 初始化 COM 库
            try:
                convert(docx_path, pdf_path)  # 将 DOCX 转换为 PDF
            finally:
                pythoncom.CoUninitialize()  # 释放 COM 库

        return send_file(
            pdf_path,
            mimetype='application/pdf',
            as_attachment=False,  # 这很重要，确保PDF在浏览器中显示而不是下载
            download_name=f"{base_name}_extracted.pdf"
        )
    except Exception as e:
        return jsonify({'error': f'转换错误: {str(e)}'}), 500

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        return jsonify({'message': 'File uploaded successfully', 'filename': filename}), 200
    return jsonify({'error': 'File type not allowed'}), 400

@app.route('/api/files', methods=['GET'])
def get_files():
    files = []
    for filename in os.listdir(app.config['UPLOAD_FOLDER']):
        if allowed_file(filename):
            file_path = os.path.join('/uploads', filename)
            files.append({
                'name': filename,
                'path': file_path
            })
    return jsonify(files)

@app.route('/api/ai-news-files', methods=['GET'])
def get_ai_news_files():
    try:
        print(f"AI_NEWS_FOLDER path: {AI_NEWS_FOLDER}")
        print(f"AI_NEWS_FOLDER exists: {os.path.exists(AI_NEWS_FOLDER)}")
        
        if not os.path.exists(AI_NEWS_FOLDER):
            return jsonify({'error': f'AI时讯文件夹不存在: {AI_NEWS_FOLDER}'}), 500
        
        files = []
        folder_contents = os.listdir(AI_NEWS_FOLDER)
        print(f"Folder contents: {folder_contents}")
        
        for filename in folder_contents:
            print(f"Checking file: {filename}, allowed: {allowed_file(filename)}")
            if allowed_file(filename):
                file_path = os.path.join('/ai_news_pdfs', filename)
                files.append({
                    'id': len(files) + 1,
                    'name': filename,
                    'path': file_path
                })
        
        print(f"Returning {len(files)} files")
        return jsonify(files)
    except Exception as e:
        error_msg = f'获取AI时讯文件列表失败: {str(e)}'
        print(error_msg)
        return jsonify({'error': error_msg}), 500

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/ai_news_pdfs/<filename>')
def ai_news_file(filename):
    return send_from_directory(AI_NEWS_FOLDER, filename)

def backup_file_to_user_folder(source_file_path, user_ip, original_filename=None):
    """将处理后的文件备份到用户IP对应的文件夹中"""
    try:
        # 使用新的目录结构
        _, _, backup_dir = get_user_dirs(user_ip, 'pdf_reader')
        
        # 获取源文件名
        source_filename = os.path.basename(source_file_path)
        backup_file_path = os.path.join(backup_dir, source_filename)
        
        # 复制文件到备份目录
        import shutil
        shutil.copy2(source_file_path, backup_file_path)
        
        print(f"文件已备份到: {backup_file_path}")
        return True, backup_file_path
    except Exception as e:
        print(f"备份文件失败: {str(e)}")
        return False, str(e)

def process_single_file(file_path, output_dir, original_filename=None, user_ip=None):
    """处理单个文件的函数"""
    try:
        print(f"开始处理文件: {file_path}")
        
        # 检查文件是否存在
        if not os.path.exists(file_path):
            raise Exception(f"文件不存在: {file_path}")
        
        print(f"文件大小: {os.path.getsize(file_path)} bytes")
        
        # 检查是否支持该文件格式
        extractor = get_file_extractor(file_path)
        if not extractor:
            file_ext = file_path.lower().split('.')[-1]
            raise Exception(f"不支持的文件格式: .{file_ext}")
        
        # 如果没有传递user_ip，尝试获取（但在异步线程中可能失败）
        if user_ip is None:
            try:
                user_ip = get_real_ip()
            except RuntimeError:
                # 在异步线程中无法获取request context，使用默认值
                user_ip = 'default_user'
        
        # 检查是否已取消（只有在有有效user_ip时才检查）
        if user_ip != 'default_user' and user_ip in pdf_reader_ip_states:
            if pdf_reader_ip_states[user_ip].get('cancel_flag', False):
                print(f"用户取消了文件处理: {file_path}")
                return False, "处理已取消"
        
        # 使用新的处理函数，传递原始文件名
        success, message = process_single_document_with_name(file_path, output_dir, original_filename)
        
        # 再次检查是否已取消（只有在有有效user_ip时才检查）
        if user_ip != 'default_user' and user_ip in pdf_reader_ip_states:
            if pdf_reader_ip_states[user_ip].get('cancel_flag', False):
                print(f"用户取消了文件处理: {file_path}")
                return False, "处理已取消"
        
        if success:
            print(f"文件处理完成: {file_path}")
            return True, "处理成功"
        else:
            print(f"文件处理失败: {message}")
            return False, message
            
    except Exception as e:
        error_msg = f"处理文件失败: {str(e)}"
        print(error_msg)
        return False, error_msg

@app.route('/api/pdf-reader/upload', methods=['POST'])
def upload_for_reading():
    global processing_status
    if 'file' not in request.files:
        return jsonify({'error': '没有文件上传'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '没有选择文件'}), 400
    
    if file:
        try:
            # 获取用户IP
            user_ip = get_real_ip()
            temp_dir, output_dir, _ = get_user_dirs(user_ip, 'pdf_reader')
            
            # 保留原始文件名，但确保路径安全
            original_filename = file.filename
            # 创建一个安全的文件路径，但保留原始文件名用于处理
            import uuid
            safe_filename = f"{uuid.uuid4().hex}_{original_filename}"
            file_path = os.path.join(temp_dir, safe_filename)
            
            # 保存上传的文件
            file.save(file_path)
            
            # 重置处理状态
            processing_status = {
                'currentFile': original_filename,  # 显示原始文件名
                'currentPage': 0,
                'totalPages': 0,
                'status': '开始处理'
            }
            
            # 启动异步处理，传递原始文件名和用户IP
            thread = threading.Thread(target=process_file_async, args=(file_path, original_filename, user_ip))
            thread.daemon = True  # 设置为守护线程
            thread.start()
            
            return jsonify({
                'message': '文件上传成功，开始处理',
                'filename': original_filename
            }), 200
            
        except Exception as e:
            logging.error(f"文件上传处理失败: {str(e)}")
            return jsonify({'error': f'处理文件时出错: {str(e)}'}), 500

# 为每个IP保存PDF文档解读的处理状态
pdf_reader_ip_states = {}

@app.route('/api/pdf-reader/progress', methods=['GET'])
def get_pdf_reader_progress():
    """获取文件处理进度"""
    try:
        user_ip = get_real_ip()
        
        # 如果用户IP不在状态字典中，初始化它
        if user_ip not in pdf_reader_ip_states:
            pdf_reader_ip_states[user_ip] = {
                'currentFile': '',
                'status': '等待处理'
            }
        
        # 获取用户的状态
        user_status = pdf_reader_ip_states[user_ip]
        
        # 如果状态是"已完成"或"已取消"，保持状态一段时间后重置
        if user_status.get('status') in ['已完成', '已取消']:
            # 检查是否已经过了5秒
            if 'completion_time' not in user_status:
                user_status['completion_time'] = time.time()
            elif time.time() - user_status['completion_time'] > 2:
                # 5秒后重置状态
                pdf_reader_ip_states[user_ip] = {
                    'currentFile': '',
                    'status': '等待处理'
                }
        
        return jsonify(pdf_reader_ip_states[user_ip])
    except Exception as e:
        logging.error(f"获取进度失败: {str(e)}")
        return jsonify({
            'currentFile': '',
            'status': '获取进度失败'
        }), 500

@app.route('/api/pdf-reader/cancel', methods=['POST'])
def cancel_pdf_reader_processing():
    """取消PDF文档解读处理"""
    try:
        user_ip = get_real_ip()
        
        # 如果用户IP不在状态字典中，初始化它
        if user_ip not in pdf_reader_ip_states:
            pdf_reader_ip_states[user_ip] = {
                'currentFile': '',
                'status': '等待处理'
            }
        
        # 更新用户的状态为已取消
        pdf_reader_ip_states[user_ip].update({
            'currentFile': '',
            'status': '已取消'
        })
        
        # 设置取消标志
        if 'cancel_flag' not in pdf_reader_ip_states[user_ip]:
            pdf_reader_ip_states[user_ip]['cancel_flag'] = True
        
        return jsonify({'message': '处理已取消'}), 200
    except Exception as e:
        logging.error(f"取消处理失败: {str(e)}")
        return jsonify({'error': str(e)}), 500

def process_file_async(file_path, original_filename, user_ip):
    """异步处理文件"""
    try:
        print(f"异步处理开始: {file_path} (原始文件名: {original_filename})")
        
        # 确保用户IP在状态字典中
        if user_ip not in pdf_reader_ip_states:
            pdf_reader_ip_states[user_ip] = {
                'currentFile': '',
                'status': '等待处理',
                'cancel_flag': False
            }
        
        # 重置取消标志
        pdf_reader_ip_states[user_ip]['cancel_flag'] = False
        
        # 更新状态为处理中
        pdf_reader_ip_states[user_ip].update({
            'currentFile': original_filename,
            'status': '正在处理'
        })
        
        print("开始调用实际处理函数...")
        # 获取用户特定的输出目录
        _, output_dir, _ = get_user_dirs(user_ip, 'pdf_reader')
        
        # 检查是否已取消
        if pdf_reader_ip_states[user_ip].get('cancel_flag', False):
            pdf_reader_ip_states[user_ip].update({
                'status': '已取消',
                'currentFile': ''
            })
            return
        
        # 调用实际的PDF处理函数，传递原始文件名、输出目录和用户IP
        success, message = process_single_file(file_path, output_dir, original_filename, user_ip)
        
        # 再次检查是否已取消
        if pdf_reader_ip_states[user_ip].get('cancel_flag', False):
            pdf_reader_ip_states[user_ip].update({
                'status': '已取消',
                'currentFile': ''
            })
            return
        
        if success:
            # 更新状态为已完成
            pdf_reader_ip_states[user_ip].update({
                'status': '已完成',
                'currentFile': original_filename
            })
            print(f"文件处理完成: {original_filename}")
            
            # 处理完成后，自动备份文件到用户IP文件夹
            try:
                _, _, backup_dir = get_user_dirs(user_ip, 'pdf_reader')
                
                # 查找处理后的输出文件
                for filename in os.listdir(output_dir):
                    if filename.endswith('.docx') and '_' in filename:
                        # 检查是否是刚刚处理的文件（包含原始文件名）
                        base_original_name = os.path.splitext(original_filename)[0]
                        if base_original_name in filename:
                            output_file_path = os.path.join(output_dir, filename)
                            backup_success, backup_msg = backup_file_to_user_folder(output_file_path, user_ip, original_filename)
                            if backup_success:
                                print(f"文件自动备份成功: {backup_msg}")
                            else:
                                print(f"文件自动备份失败: {backup_msg}")
                            break
            except Exception as backup_error:
                print(f"自动备份过程出错: {str(backup_error)}")
        else:
            pdf_reader_ip_states[user_ip].update({
                'status': f'处理失败: {message}',
                'currentFile': original_filename
            })
            print(f"文件处理失败: {message}")
            
    except Exception as e:
        pdf_reader_ip_states[user_ip].update({
            'status': f'处理出错: {str(e)}',
            'currentFile': original_filename
        })
        print(f"异步处理出错: {str(e)}")
    finally:
        # 清理临时文件
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            print(f"清理临时文件失败: {str(e)}")

@app.route('/api/pdf-reader/files', methods=['GET'])
def get_pdf_reader_files():
    """获取已处理的文件列表"""
    try:
        user_ip = get_real_ip()
        _, output_dir, _ = get_user_dirs(user_ip, 'pdf_reader')
        
        files = []
        # 扫描输出目录中的所有.docx文件
        for filename in os.listdir(output_dir):
            if filename.endswith('.docx') and '_' in filename:
                # 新的命名格式：原文件名_日期.docx
                # 检查是否符合日期格式（最后一部分是8位数字）
                parts = filename.replace('.docx', '').split('_')
                if len(parts) >= 2 and parts[-1].isdigit() and len(parts[-1]) == 8:
                    files.append(filename)
        return jsonify(files)
    except Exception as e:
        logging.error(f"获取文件列表失败: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/pdf-reader/download/<filename>', methods=['GET'])
def download_pdf_reader_file(filename):
    """下载处理后的文件"""
    try:
        user_ip = get_real_ip()
        _, output_dir, _ = get_user_dirs(user_ip, 'pdf_reader')
        file_path = os.path.join(output_dir, filename)
        
        if not os.path.exists(file_path):
            return jsonify({'error': f'文件不存在: {filename}'}), 404
            
        return send_from_directory(
            output_dir,
            filename,
            as_attachment=True
        )
    except Exception as e:
        logging.error(f"下载文件失败: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/pdf-reader/preview/<filename>', methods=['GET'])
def preview_pdf_reader_file(filename):
    """预览处理后的文件"""
    try:
        user_ip = get_real_ip()
        _, output_dir, _ = get_user_dirs(user_ip, 'pdf_reader')
        docx_path = os.path.join(output_dir, filename)
        
        if not os.path.exists(docx_path):
            return jsonify({'error': f'文件不存在: {filename}'}), 404

        # 生成PDF预览文件
        pdf_filename = filename.replace('.docx', '.pdf')
        pdf_path = os.path.join(output_dir, pdf_filename)

        try:
            if not os.path.exists(pdf_path):
                pythoncom.CoInitialize()
                try:
                    convert(docx_path, pdf_path)
                finally:
                    pythoncom.CoUninitialize()

            return send_file(
                pdf_path,
                mimetype='application/pdf',
                as_attachment=False,
                download_name=pdf_filename
            )
        except Exception as e:
            logging.error(f"PDF转换失败: {str(e)}")
            return jsonify({'error': f'转换错误: {str(e)}'}), 500
    except Exception as e:
        logging.error(f"预览文件失败: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/pdf-reader/delete/<filename>', methods=['DELETE'])
def delete_pdf_reader_file(filename):
    """删除文件"""
    try:
        user_ip = get_real_ip()
        temp_dir, output_dir, _ = get_user_dirs(user_ip, 'pdf_reader')
        
        # 删除上传的原始文件
        original_file = os.path.join(temp_dir, filename)
        if os.path.exists(original_file):
            os.remove(original_file)
            
        # 删除处理后的文件
        processed_file = os.path.join(output_dir, filename)
        if os.path.exists(processed_file):
            os.remove(processed_file)
            
        return jsonify({'message': '文件删除成功'})
    except Exception as e:
        logging.error(f"删除文件失败: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/pdf-reader/batch-download', methods=['GET'])
def batch_download_pdf_reader():
    """批量下载所有处理后的文件"""
    try:
        user_ip = get_real_ip()
        _, output_dir, _ = get_user_dirs(user_ip, 'pdf_reader')
        
        import zipfile
        import io
        
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for filename in os.listdir(output_dir):
                if filename.endswith('.docx') and '_' in filename:
                    # 检查是否符合新的命名格式（原文件名_日期.docx）
                    parts = filename.replace('.docx', '').split('_')
                    if len(parts) >= 2 and parts[-1].isdigit() and len(parts[-1]) == 8:
                        file_path = os.path.join(output_dir, filename)
                        zip_file.write(file_path, filename)
        
        zip_buffer.seek(0)
        return send_file(
            zip_buffer,
            mimetype='application/zip',
            as_attachment=True,
            download_name='pdf_reader_files.zip'
        )
    except Exception as e:
        logging.error(f"批量下载失败: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/pdf-reader/backup-info', methods=['GET'])
def get_backup_info():
    """获取所有用户的备份文件信息"""
    try:
        backup_info = {}
        
        if os.path.exists(BACKUP_DIR):
            for user_ip in os.listdir(BACKUP_DIR):
                user_dir = os.path.join(BACKUP_DIR, user_ip)
                if os.path.isdir(user_dir):
                    files = []
                    for filename in os.listdir(user_dir):
                        if filename.endswith('.docx'):
                            file_path = os.path.join(user_dir, filename)
                            file_stat = os.stat(file_path)
                            files.append({
                                'filename': filename,
                                'size': file_stat.st_size,
                                'created_time': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(file_stat.st_ctime))
                            })
                    backup_info[user_ip] = files
        
        return jsonify(backup_info)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pdf-reader/current-user-backups', methods=['GET'])
def get_current_user_backups():
    """获取当前用户的备份文件"""
    try:
        user_ip = get_real_ip()
        _, _, backup_dir = get_user_dirs(user_ip, 'pdf_reader')
        
        files = []
        if os.path.exists(backup_dir):
            for filename in os.listdir(backup_dir):
                if filename.endswith('.docx'):
                    file_path = os.path.join(backup_dir, filename)
                    file_stat = os.stat(file_path)
                    files.append({
                        'filename': filename,
                        'size': file_stat.st_size,
                        'created_time': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(file_stat.st_ctime))
                    })
        
        return jsonify({
            'user_ip': user_ip,
            'files': files
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== 视频处理功能 ====================
# 视频处理状态管理（按照front_back的实现）
video_ip_states = {}

# 视频处理配置（从front_back复制）
target_sample_rate = 16000
max_segment_length = 300
noise_reduction_prop_decrease = 0.1
use_gpu = False

# 加载Whisper模型
try:
    device = "cuda" if use_gpu else "cpu"
    model = whisper.load_model('medium', device=device)
    logging.info(f"Whisper模型加载成功，使用设备: {device}")
except Exception as e:
    logging.error(f"Whisper模型加载失败: {str(e)}")
    model = None

# 导入视频处理模块
from modules.video_processor import transcribe_single_video

# 视频上传路由
@app.route('/upload-video', methods=['POST'])
def upload_video_files():
    try:
        client_ip = get_real_ip()
        logging.info(f"收到视频上传请求，客户端IP: {client_ip}")

        if client_ip not in video_ip_states:
            video_ip_states[client_ip] = {
                'progress': {'currentFile': '', 'status': '等待处理'},
                'total_files': 0,
                'processed_files': 0,
                'canceled': False
            }
        else:
            # 重置状态
            video_ip_states[client_ip] = {
                'progress': {'currentFile': '', 'status': '等待处理'},
                'total_files': 0,
                'processed_files': 0,
                'canceled': False
            }

        if 'file' not in request.files:
            return jsonify({'error': '没有文件上传'}), 400

        files = request.files.getlist('file')
        if not files:
            return jsonify({'error': '没有视频文件上传'}), 400

        # 使用新的目录结构
        temp_dir, output_dir, _ = get_user_dirs(client_ip, 'video')

        # 清空临时输出目录
        clear_temp_directory(output_dir)

        video_ip_states[client_ip]['total_files'] = len(files)
        video_ip_states[client_ip]['processed_files'] = 0
        video_ip_states[client_ip]['canceled'] = False
        video_ip_states[client_ip]['progress']['status'] = '等待处理'

        # 保存所有文件到临时目录
        file_paths = []
        for file in files:
            if not allowed_video_file(file.filename):
                return jsonify({'error': f'文件类型不支持: {file.filename}'}), 400
            file_path = os.path.join(temp_dir, file.filename)
            file.save(file_path)
            file_paths.append(file_path)

        # 使用单个线程顺序处理所有视频文件
        thread = Thread(target=process_videos_sequentially, args=(client_ip, file_paths, output_dir))
        thread.daemon = True
        thread.start()

        return jsonify({'message': '视频上传开始处理', 'total_files': len(files)}), 200
    except Exception as e:
        logging.error(f"视频上传处理失败: {str(e)}")
        return jsonify({'error': f'处理文件时出错: {str(e)}'}), 500

def process_videos_sequentially(ip, file_paths, temp_video_output_dir):
    """顺序处理多个视频文件，避免Whisper模型冲突"""
    try:
        print(f"\n🎬 开始批量处理视频文件")
        print(f"   用户IP: {ip}")
        print(f"   文件数量: {len(file_paths)}")
        print(f"   处理模式: 顺序处理 (避免Whisper模型冲突)")
        print("=" * 60)

        for i, video_path in enumerate(file_paths):
            # 检查是否被取消
            if video_ip_states[ip]['canceled']:
                print(f"❌ 用户 {ip} 取消了视频处理")
                logging.info(f"用户 {ip} 取消了视频处理")
                break

            print(f"\n📹 处理进度: {i+1}/{len(file_paths)}")
            logging.info(f"开始处理第 {i+1}/{len(file_paths)} 个视频: {os.path.basename(video_path)}")

            process_video(ip, video_path, temp_video_output_dir)

            # 处理完成后短暂休息，确保资源释放
            time.sleep(0.5)

        if not video_ip_states[ip]['canceled']:
            print(f"\n🎉 所有视频文件处理完成!")
            print(f"   共处理: {len(file_paths)} 个文件")
            print("=" * 60)

    except Exception as e:
        print(f"❌ 顺序处理视频时出错: {str(e)}")
        logging.error(f"顺序处理视频时出错: {str(e)}")
        # 更新状态为处理失败
        if ip in video_ip_states:
            video_ip_states[ip]['progress']['status'] = '处理失败'

def process_video(ip, video_path, temp_video_output_dir):
    try:
        # 使用新的目录结构
        _, _, backup_dir = get_user_dirs(ip, 'video')
        video_filename = os.path.basename(video_path)
        base_name = os.path.splitext(video_filename)[0]

        def check_canceled():
            return video_ip_states[ip]['canceled']

        def update_progress(status, current_file=None):
            video_ip_states[ip]['progress']['status'] = status
            if current_file:
                video_ip_states[ip]['progress']['currentFile'] = current_file

        # 检查是否取消了解析操作
        if check_canceled():
            update_progress('已取消')
            if os.path.exists(video_path):
                try:
                    time.sleep(1)
                    os.remove(video_path)
                except Exception as e:
                    logging.error(f"删除视频文件 {video_path} 失败: {str(e)}")
            return

        update_progress('正在处理中', video_filename)

        try:
            # 再次检查是否取消了解析操作
            if check_canceled():
                print(f"❌ 用户取消了视频解析: {video_filename}")
                if os.path.exists(video_path):
                    try:
                        time.sleep(1)
                        os.remove(video_path)
                    except Exception as e:
                        logging.error(f"删除视频文件 {video_path} 失败: {str(e)}")
                return

            # 视频转文字 - 使用锁确保Whisper模型不会被并发访问
            with whisper_lock:
                logging.info(f"获取Whisper锁，开始处理: {video_filename}")
                print(f"🔄 正在使用Whisper模型处理: {video_filename}")
                transcribe_single_video(
                    video_path,
                    model,
                    target_sample_rate,
                    max_segment_length,
                    noise_reduction_prop_decrease,
                    temp_video_output_dir,
                    check_canceled
                )
                logging.info(f"释放Whisper锁，完成处理: {video_filename}")
                print(f"✅ Whisper模型处理完成: {video_filename}")

            # 如果已经取消，直接返回
            if check_canceled():
                if os.path.exists(video_path):
                    try:
                        time.sleep(1)
                        os.remove(video_path)
                    except Exception as e:
                        logging.error(f"删除视频文件 {video_path} 失败: {str(e)}")
                return

            srt_file = os.path.join(temp_video_output_dir, f"{base_name}.srt")
            txt_file = os.path.join(temp_video_output_dir, f"{base_name}.txt")

            if not os.path.exists(srt_file) or not os.path.exists(txt_file):
                raise Exception(f"视频转文字失败，未生成相应文件：{srt_file} 或 {txt_file}")

            # 检查文件大小和内容
            srt_size = os.path.getsize(srt_file) if os.path.exists(srt_file) else 0
            txt_size = os.path.getsize(txt_file) if os.path.exists(txt_file) else 0

            if srt_size == 0 and txt_size == 0:
                raise Exception("生成的字幕文件为空，可能是音频无法识别")

            # 再次检查是否取消了解析操作
            if check_canceled():
                if os.path.exists(video_path):
                    try:
                        time.sleep(1)
                        os.remove(video_path)
                    except Exception as e:
                        logging.error(f"删除视频文件 {video_path} 失败: {str(e)}")
                return

            # 处理成功后将当前文件的相关文件从临时文件夹移动到持久文件夹
            print(f"💾 开始保存处理结果...")
            print(f"   从临时目录: {temp_video_output_dir}")
            print(f"   到持久目录: {backup_dir}")

            move_video_files_to_persistent(temp_video_output_dir, backup_dir, base_name)

            # 验证文件是否成功保存
            final_srt = os.path.join(backup_dir, f"{base_name}.srt")
            final_txt = os.path.join(backup_dir, f"{base_name}.txt")

            print(f"✅ 视频解析完成并保存成功: {video_filename}")
            print(f"   📄 SRT字幕文件: {final_srt}")
            print(f"   📄 TXT文本文件: {final_txt}")

            if os.path.exists(final_srt):
                print(f"   📊 SRT文件大小: {os.path.getsize(final_srt)} 字节")
            if os.path.exists(final_txt):
                print(f"   📊 TXT文件大小: {os.path.getsize(final_txt)} 字节")
            print()

            # 更新处理状态
            video_ip_states[ip]['processed_files'] += 1
            if video_ip_states[ip]['processed_files'] < video_ip_states[ip]['total_files']:
                # 如果还有文件要处理，更新状态为等待处理下一个文件
                update_progress('等待处理')
            else:
                # 所有文件处理完成
                update_progress('已完成')
                # 重置处理状态，为下一次处理做准备
                video_ip_states[ip]['processed_files'] = 0
                video_ip_states[ip]['total_files'] = 0
                video_ip_states[ip]['canceled'] = False
        except Exception as e:
            error_msg = str(e)
            print(f"❌ 视频解析失败: {video_filename}")
            print(f"   错误信息: {error_msg}")
            print(f"   文件路径: {video_path}")
            print()

            logging.error(f"处理视频文件 {video_filename} 时出错: {error_msg}")
            update_progress('处理失败', video_filename)
            # 清除临时文件
            temp_dir, output_dir, _ = get_user_dirs(ip, 'video')
            clear_temp_directory(output_dir)
        if os.path.exists(video_path):
            try:
                time.sleep(1)
                os.remove(video_path)
            except Exception as e:
                logging.error(f"删除视频文件 {video_path} 失败: {str(e)}")
    except Exception as e:
        logging.error(f"视频处理失败：{str(e)}")
        update_progress('处理失败')

def move_video_files_to_persistent(temp_video_output_dir, persistent_video_output_dir, base_name):
    for root, dirs, files in os.walk(temp_video_output_dir):
        for file in files:
            if base_name in file:
                temp_file_path = os.path.join(root, file)
                relative_path = os.path.relpath(temp_file_path, temp_video_output_dir)
                persistent_file_path = os.path.join(persistent_video_output_dir, relative_path)
                persistent_file_dir = os.path.dirname(persistent_file_path)
                os.makedirs(persistent_file_dir, exist_ok=True)
                shutil.move(temp_file_path, persistent_file_path)

def clear_temp_video_directory(temp_video_output_dir):
    if os.path.exists(temp_video_output_dir):
        for root, dirs, files in os.walk(temp_video_output_dir):
            for file in files:
                file_path = os.path.join(root, file)
                try:
                    os.remove(file_path)
                except PermissionError:
                    try:
                        time.sleep(0.5)
                        os.remove(file_path)
                    except Exception as e:
                        logging.error(f"删除临时文件 {file_path} 失败: {str(e)}")
                except Exception as e:
                    logging.error(f"删除临时文件 {file_path} 失败: {str(e)}")
            for dir in dirs:
                dir_path = os.path.join(root, dir)
                try:
                    shutil.rmtree(dir_path)
                except Exception as e:
                    logging.error(f"删除临时目录 {dir_path} 失败: {str(e)}")

@app.route('/video-progress')
def get_video_progress():
    client_ip = get_real_ip()
    if client_ip in video_ip_states:
        progress = video_ip_states[client_ip]['progress']
        # 确保返回的状态是有效的
        valid_statuses = ['等待处理', '正在处理中', '已完成', '已取消', '处理失败']
        if progress['status'] not in valid_statuses:
            progress['status'] = '等待处理'
        return jsonify(progress)
    return jsonify({
        'currentFile': '',
        'status': '等待处理'
    })

@app.route('/video-cancel', methods=['POST'])
def cancel_video_processing():
    client_ip = get_real_ip()
    if client_ip in video_ip_states:
        # 标记为取消
        video_ip_states[client_ip]['canceled'] = True
        # 更新状态为已取消
        video_ip_states[client_ip]['progress']['status'] = '已取消'
        video_ip_states[client_ip]['progress']['currentFile'] = ''

        # 清除临时文件
        temp_dir, output_dir, _ = get_user_dirs(client_ip, 'video')
        clear_temp_directory(output_dir)
        clear_temp_directory(temp_dir)

        logging.info(f"用户 {client_ip} 取消了视频处理，已清理临时文件")

        return jsonify({
            'message': '视频处理已取消',
            'status': '已取消'
        }), 200
    return jsonify({'error': '没有正在进行的视频处理'}), 400

@app.route('/video-parsed-files')
def get_video_parsed_files():
    client_ip = get_real_ip()
    _, _, backup_dir = get_user_dirs(client_ip, 'video')
    parsed_files = set()
    for root, dirs, files in os.walk(backup_dir):
        for file in files:
            if file.endswith('.srt') or file.endswith('.txt'):
                base_name = os.path.splitext(file)[0]
                parsed_files.add(f'{base_name}.mp4')
    return jsonify(list(parsed_files))

@app.route('/video-batch-download')
def video_batch_download():
    client_ip = get_real_ip()
    _, _, backup_dir = get_user_dirs(client_ip, 'video')
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for filename in os.listdir(backup_dir):
            file_path = os.path.join(backup_dir, filename)
            zip_file.write(file_path, filename)

    zip_buffer.seek(0)
    return send_file(
        zip_buffer,
        mimetype='application/zip',
        as_attachment=True,
        download_name='processed_video_files.zip'
    )

@app.route('/video-delete/<path:filename>', methods=['DELETE'])
def delete_video_files(filename):
    client_ip = get_real_ip()
    _, _, backup_dir = get_user_dirs(client_ip, 'video')
    base_name = os.path.splitext(filename)[0]
    pattern = re.compile(rf'^{base_name}.*')
    for root, dirs, files in os.walk(backup_dir):
        for file in files:
            if pattern.match(file):
                file_path = os.path.join(root, file)
                os.remove(file_path)
    return jsonify({'message': '视频文件删除成功'}), 200

@app.route('/video-download-single/<path:filename>')
def download_single_video_file(filename):
    client_ip = get_real_ip()
    _, _, backup_dir = get_user_dirs(client_ip, 'video')
    base_name = os.path.splitext(filename)[0]
    pattern = re.compile(rf'^{base_name}.*')
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for root, dirs, files in os.walk(backup_dir):
            for file in files:
                if pattern.match(file):
                    file_path = os.path.join(root, file)
                    zip_file.write(file_path, os.path.relpath(file_path, backup_dir))
    zip_buffer.seek(0)
    return send_file(
        zip_buffer,
        mimetype='application/zip',
        as_attachment=True,
        download_name=f'{base_name}_video_files.zip'
    )

@app.route('/video-preview/<path:filename>')
def video_txt_preview(filename):
    client_ip = get_real_ip()
    _, _, backup_dir = get_user_dirs(client_ip, 'video')
    base_name = os.path.splitext(filename)[0]
    txt_file_path = os.path.join(backup_dir, f"{base_name}.txt")
    if os.path.exists(txt_file_path):
        try:
            with open(txt_file_path, 'r', encoding='utf-8') as file:
                txt_content = file.read()
            return jsonify({'content': txt_content})
        except Exception as e:
            return jsonify({'error': f'读取文件出错: {str(e)}'}), 500
    return jsonify({'error': 'TXT文件未找到'}), 404

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)