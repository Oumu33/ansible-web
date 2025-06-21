from flask import request, jsonify, send_file
from flask_restful import Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.vault_service import VaultService
import os
import tempfile
from datetime import datetime


class VaultInfoResource(Resource):
    """Vault信息资源"""
    
    @jwt_required()
    def get(self):
        """获取Vault配置信息"""
        try:
            vault_service = VaultService()
            info = vault_service.get_vault_info()
            return info
        except Exception as e:
            return {'error': str(e)}, 500


class VaultEncryptResource(Resource):
    """Vault加密资源"""
    
    @jwt_required()
    def post(self):
        """加密字符串或文件"""
        try:
            data = request.get_json()
            vault_service = VaultService()
            
            if 'content' in data:
                # 加密字符串
                encrypted = vault_service.encrypt_string(data['content'])
                return {
                    'encrypted_content': encrypted,
                    'type': 'string',
                    'timestamp': datetime.utcnow().isoformat()
                }
            elif 'file_path' in data:
                # 加密文件
                file_path = data['file_path']
                output_path = data.get('output_path')
                
                encrypted_file = vault_service.encrypt_file(file_path, output_path)
                return {
                    'encrypted_file': encrypted_file,
                    'original_file': file_path,
                    'type': 'file',
                    'timestamp': datetime.utcnow().isoformat()
                }
            else:
                return {'error': 'Either content or file_path is required'}, 400
        except Exception as e:
            return {'error': str(e)}, 500


class VaultDecryptResource(Resource):
    """Vault解密资源"""
    
    @jwt_required()
    def post(self):
        """解密字符串或文件"""
        try:
            data = request.get_json()
            vault_service = VaultService()
            
            if 'encrypted_content' in data:
                # 解密字符串
                decrypted = vault_service.decrypt_string(data['encrypted_content'])
                return {
                    'decrypted_content': decrypted,
                    'type': 'string',
                    'timestamp': datetime.utcnow().isoformat()
                }
            elif 'file_path' in data:
                # 解密文件
                file_path = data['file_path']
                output_path = data.get('output_path')
                
                decrypted_file = vault_service.decrypt_file(file_path, output_path)
                return {
                    'decrypted_file': decrypted_file,
                    'encrypted_file': file_path,
                    'type': 'file',
                    'timestamp': datetime.utcnow().isoformat()
                }
            else:
                return {'error': 'Either encrypted_content or file_path is required'}, 400
        except Exception as e:
            return {'error': str(e)}, 500


class VaultFileListResource(Resource):
    """Vault文件列表资源"""
    
    @jwt_required()
    def get(self):
        """获取Vault文件列表"""
        try:
            directory = request.args.get('directory', '/app/vault')
            vault_service = VaultService()
            
            files = vault_service.list_vault_files(directory)
            
            return {
                'directory': directory,
                'files': files,
                'total_files': len(files),
                'encrypted_files': len([f for f in files if f['is_encrypted']]),
                'timestamp': datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {'error': str(e)}, 500


class VaultFileResource(Resource):
    """Vault文件资源"""
    
    @jwt_required()
    def get(self, file_path):
        """获取Vault文件内容（用于编辑）"""
        try:
            vault_service = VaultService()
            
            # 解码文件路径
            import urllib.parse
            decoded_path = urllib.parse.unquote(file_path)
            
            result = vault_service.edit_vault_file(decoded_path)
            
            return {
                'file_path': decoded_path,
                'content': result['content'],
                'is_encrypted': result['is_encrypted'],
                'timestamp': datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {'error': str(e)}, 500
    
    @jwt_required()
    def put(self, file_path):
        """保存Vault文件"""
        try:
            data = request.get_json()
            vault_service = VaultService()
            
            # 解码文件路径
            import urllib.parse
            decoded_path = urllib.parse.unquote(file_path)
            
            content = data.get('content', '')
            encrypt = data.get('encrypt', True)
            
            saved_file = vault_service.save_vault_file(decoded_path, content, encrypt)
            
            return {
                'file_path': saved_file,
                'encrypted': encrypt,
                'size': os.path.getsize(saved_file) if os.path.exists(saved_file) else 0,
                'timestamp': datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {'error': str(e)}, 500
    
    @jwt_required()
    def post(self, file_path):
        """创建新的Vault文件"""
        try:
            data = request.get_json()
            vault_service = VaultService()
            
            # 解码文件路径
            import urllib.parse
            decoded_path = urllib.parse.unquote(file_path)
            
            content = data.get('content', '')
            
            created_file = vault_service.create_vault_file(content, decoded_path)
            
            return {
                'file_path': created_file,
                'encrypted': True,
                'size': os.path.getsize(created_file),
                'timestamp': datetime.utcnow().isoformat()
            }, 201
        except Exception as e:
            return {'error': str(e)}, 500
    
    @jwt_required()
    def delete(self, file_path):
        """删除Vault文件"""
        try:
            # 解码文件路径
            import urllib.parse
            decoded_path = urllib.parse.unquote(file_path)
            
            if os.path.exists(decoded_path):
                os.remove(decoded_path)
                return {
                    'message': 'Vault file deleted successfully',
                    'file_path': decoded_path,
                    'timestamp': datetime.utcnow().isoformat()
                }
            else:
                return {'error': 'File not found'}, 404
        except Exception as e:
            return {'error': str(e)}, 500


class VaultValidateResource(Resource):
    """Vault验证资源"""
    
    @jwt_required()
    def post(self, file_path):
        """验证Vault文件"""
        try:
            vault_service = VaultService()
            
            # 解码文件路径
            import urllib.parse
            decoded_path = urllib.parse.unquote(file_path)
            
            validation = vault_service.validate_vault_file(decoded_path)
            
            return {
                'file_path': decoded_path,
                'validation': validation,
                'timestamp': datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {'error': str(e)}, 500


class VaultRekeyResource(Resource):
    """Vault重新加密资源"""
    
    @jwt_required()
    def post(self, file_path):
        """重新加密Vault文件"""
        try:
            data = request.get_json()
            vault_service = VaultService()
            
            # 解码文件路径
            import urllib.parse
            decoded_path = urllib.parse.unquote(file_path)
            
            new_password = data.get('new_password')
            
            rekeyed_file = vault_service.rekey_vault_file(decoded_path, new_password)
            
            return {
                'file_path': rekeyed_file,
                'message': 'Vault file rekeyed successfully',
                'timestamp': datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {'error': str(e)}, 500


class VaultYamlResource(Resource):
    """Vault YAML处理资源"""
    
    @jwt_required()
    def post(self):
        """加密YAML文件中的指定键值"""
        try:
            data = request.get_json()
            vault_service = VaultService()
            
            yaml_content = data.get('yaml_content', '')
            keys_to_encrypt = data.get('keys_to_encrypt', [])
            action = data.get('action', 'encrypt')  # encrypt or decrypt
            
            if action == 'encrypt':
                result = vault_service.encrypt_yaml_values(yaml_content, keys_to_encrypt)
                return {
                    'encrypted_yaml': result,
                    'action': 'encrypt',
                    'keys_encrypted': keys_to_encrypt,
                    'timestamp': datetime.utcnow().isoformat()
                }
            elif action == 'decrypt':
                result = vault_service.decrypt_yaml_values(yaml_content)
                return {
                    'decrypted_yaml': result,
                    'action': 'decrypt',
                    'timestamp': datetime.utcnow().isoformat()
                }
            else:
                return {'error': 'Invalid action. Use encrypt or decrypt'}, 400
        except Exception as e:
            return {'error': str(e)}, 500


class VaultExportResource(Resource):
    """Vault导出资源"""
    
    @jwt_required()
    def get(self, file_path):
        """导出Vault文件"""
        try:
            # 解码文件路径
            import urllib.parse
            decoded_path = urllib.parse.unquote(file_path)
            
            if not os.path.exists(decoded_path):
                return {'error': 'File not found'}, 404
            
            # 创建临时文件用于下载
            with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.vault') as tmp_file:
                with open(decoded_path, 'r') as src_file:
                    tmp_file.write(src_file.read())
                tmp_file_path = tmp_file.name
            
            # 返回文件供下载
            return send_file(
                tmp_file_path,
                as_attachment=True,
                download_name=os.path.basename(decoded_path),
                mimetype='text/plain'
            )
        except Exception as e:
            return {'error': str(e)}, 500


class VaultImportResource(Resource):
    """Vault导入资源"""
    
    @jwt_required()
    def post(self):
        """导入Vault文件"""
        try:
            if 'file' not in request.files:
                return {'error': 'No file provided'}, 400
            
            file = request.files['file']
            target_path = request.form.get('target_path')
            
            if not target_path:
                return {'error': 'Target path is required'}, 400
            
            # 确保目标目录存在
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            
            # 保存文件
            file.save(target_path)
            
            # 验证文件
            vault_service = VaultService()
            validation = vault_service.validate_vault_file(target_path)
            
            return {
                'imported_file': target_path,
                'validation': validation,
                'size': os.path.getsize(target_path),
                'timestamp': datetime.utcnow().isoformat()
            }, 201
        except Exception as e:
            return {'error': str(e)}, 500


class VaultPasswordResource(Resource):
    """Vault密码管理资源"""
    
    @jwt_required()
    def post(self):
        """更新Vault密码"""
        try:
            data = request.get_json()
            new_password = data.get('new_password')
            
            if not new_password:
                return {'error': 'New password is required'}, 400
            
            vault_service = VaultService()
            
            # 更新密码文件
            with open(vault_service.vault_password_file, 'w') as f:
                f.write(new_password)
            
            os.chmod(vault_service.vault_password_file, 0o600)
            
            return {
                'message': 'Vault password updated successfully',
                'timestamp': datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {'error': str(e)}, 500
    
    @jwt_required()
    def get(self):
        """检查密码文件状态"""
        try:
            vault_service = VaultService()
            
            password_exists = os.path.exists(vault_service.vault_password_file)
            
            if password_exists:
                stat = os.stat(vault_service.vault_password_file)
                return {
                    'password_file_exists': True,
                    'file_path': vault_service.vault_password_file,
                    'file_size': stat.st_size,
                    'last_modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    'permissions': oct(stat.st_mode)[-3:]
                }
            else:
                return {
                    'password_file_exists': False,
                    'file_path': vault_service.vault_password_file
                }
        except Exception as e:
            return {'error': str(e)}, 500