import os
import tempfile
import subprocess
import yaml
from typing import Dict, Any, Optional, List
from cryptography.fernet import Fernet
from ansible.parsing.vault import VaultLib
from ansible.parsing.vault import VaultSecret
from flask import current_app
import base64
import json


class VaultService:
    """Ansible Vault 加密服务"""
    
    def __init__(self):
        self.vault_password_file = current_app.config.get('ANSIBLE_VAULT_PASSWORD_FILE', '/app/vault_password')
        self.vault_key_file = current_app.config.get('VAULT_KEY_FILE', '/app/vault/vault.key')
        self._ensure_vault_setup()
    
    def _ensure_vault_setup(self):
        """确保Vault环境设置正确"""
        # 确保vault目录存在
        vault_dir = os.path.dirname(self.vault_key_file)
        os.makedirs(vault_dir, exist_ok=True)
        
        # 生成或加载加密密钥
        if not os.path.exists(self.vault_key_file):
            self._generate_vault_key()
        
        # 确保vault密码文件存在
        if not os.path.exists(self.vault_password_file):
            self._generate_vault_password()
    
    def _generate_vault_key(self):
        """生成Vault加密密钥"""
        key = Fernet.generate_key()
        with open(self.vault_key_file, 'wb') as f:
            f.write(key)
        os.chmod(self.vault_key_file, 0o600)
    
    def _generate_vault_password(self):
        """生成Vault密码文件"""
        import secrets
        import string
        
        # 生成强密码
        alphabet = string.ascii_letters + string.digits + '!@#$%^&*'
        password = ''.join(secrets.choice(alphabet) for _ in range(32))
        
        with open(self.vault_password_file, 'w') as f:
            f.write(password)
        os.chmod(self.vault_password_file, 0o600)
    
    def _get_vault_password(self) -> str:
        """获取Vault密码"""
        with open(self.vault_password_file, 'r') as f:
            return f.read().strip()
    
    def _get_vault_lib(self) -> VaultLib:
        """获取VaultLib实例"""
        password = self._get_vault_password()
        vault_secret = VaultSecret(password.encode('utf-8'))
        return VaultLib([(b'default', vault_secret)])
    
    def encrypt_string(self, plaintext: str, vault_id: str = 'default') -> str:
        """加密字符串"""
        try:
            vault_lib = self._get_vault_lib()
            encrypted = vault_lib.encrypt(plaintext.encode('utf-8'), vault_id=vault_id)
            return encrypted.decode('utf-8')
        except Exception as e:
            raise Exception(f"Failed to encrypt string: {str(e)}")
    
    def decrypt_string(self, encrypted_text: str) -> str:
        """解密字符串"""
        try:
            vault_lib = self._get_vault_lib()
            decrypted = vault_lib.decrypt(encrypted_text.encode('utf-8'))
            return decrypted.decode('utf-8')
        except Exception as e:
            raise Exception(f"Failed to decrypt string: {str(e)}")
    
    def encrypt_file(self, file_path: str, output_path: Optional[str] = None) -> str:
        """加密文件"""
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
            
            with open(file_path, 'r') as f:
                content = f.read()
            
            encrypted_content = self.encrypt_string(content)
            
            if output_path is None:
                output_path = f"{file_path}.vault"
            
            with open(output_path, 'w') as f:
                f.write(encrypted_content)
            
            return output_path
        except Exception as e:
            raise Exception(f"Failed to encrypt file: {str(e)}")
    
    def decrypt_file(self, encrypted_file_path: str, output_path: Optional[str] = None) -> str:
        """解密文件"""
        try:
            if not os.path.exists(encrypted_file_path):
                raise FileNotFoundError(f"Encrypted file not found: {encrypted_file_path}")
            
            with open(encrypted_file_path, 'r') as f:
                encrypted_content = f.read()
            
            decrypted_content = self.decrypt_string(encrypted_content)
            
            if output_path is None:
                output_path = encrypted_file_path.replace('.vault', '')
            
            with open(output_path, 'w') as f:
                f.write(decrypted_content)
            
            return output_path
        except Exception as e:
            raise Exception(f"Failed to decrypt file: {str(e)}")
    
    def encrypt_yaml_values(self, yaml_content: str, keys_to_encrypt: List[str]) -> str:
        """加密YAML文件中的指定键值"""
        try:
            data = yaml.safe_load(yaml_content)
            
            def encrypt_nested_keys(obj, keys):
                if isinstance(obj, dict):
                    for key, value in obj.items():
                        if key in keys and isinstance(value, str):
                            obj[key] = self.encrypt_string(value)
                        elif isinstance(value, (dict, list)):
                            encrypt_nested_keys(value, keys)
                elif isinstance(obj, list):
                    for item in obj:
                        if isinstance(item, (dict, list)):
                            encrypt_nested_keys(item, keys)
            
            encrypt_nested_keys(data, keys_to_encrypt)
            return yaml.dump(data, default_flow_style=False)
        except Exception as e:
            raise Exception(f"Failed to encrypt YAML values: {str(e)}")
    
    def decrypt_yaml_values(self, yaml_content: str) -> str:
        """解密YAML文件中的加密值"""
        try:
            data = yaml.safe_load(yaml_content)
            
            def decrypt_nested_values(obj):
                if isinstance(obj, dict):
                    for key, value in obj.items():
                        if isinstance(value, str) and value.startswith('$ANSIBLE_VAULT;'):
                            try:
                                obj[key] = self.decrypt_string(value)
                            except:
                                # 如果解密失败，保持原值
                                pass
                        elif isinstance(value, (dict, list)):
                            decrypt_nested_values(value)
                elif isinstance(obj, list):
                    for item in obj:
                        if isinstance(item, (dict, list)):
                            decrypt_nested_values(item)
            
            decrypt_nested_values(data)
            return yaml.dump(data, default_flow_style=False)
        except Exception as e:
            raise Exception(f"Failed to decrypt YAML values: {str(e)}")
    
    def create_vault_file(self, content: str, file_path: str) -> str:
        """创建加密的Vault文件"""
        try:
            encrypted_content = self.encrypt_string(content)
            
            # 确保目录存在
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            with open(file_path, 'w') as f:
                f.write(encrypted_content)
            
            os.chmod(file_path, 0o600)
            return file_path
        except Exception as e:
            raise Exception(f"Failed to create vault file: {str(e)}")
    
    def edit_vault_file(self, file_path: str) -> Dict[str, Any]:
        """编辑Vault文件（返回解密内容供编辑）"""
        try:
            if not os.path.exists(file_path):
                return {'content': '', 'is_encrypted': False}
            
            with open(file_path, 'r') as f:
                content = f.read()
            
            # 检查是否是加密文件
            if content.startswith('$ANSIBLE_VAULT;'):
                decrypted_content = self.decrypt_string(content)
                return {'content': decrypted_content, 'is_encrypted': True}
            else:
                return {'content': content, 'is_encrypted': False}
        except Exception as e:
            raise Exception(f"Failed to edit vault file: {str(e)}")
    
    def save_vault_file(self, file_path: str, content: str, encrypt: bool = True) -> str:
        """保存Vault文件"""
        try:
            if encrypt:
                encrypted_content = self.encrypt_string(content)
                with open(file_path, 'w') as f:
                    f.write(encrypted_content)
            else:
                with open(file_path, 'w') as f:
                    f.write(content)
            
            os.chmod(file_path, 0o600)
            return file_path
        except Exception as e:
            raise Exception(f"Failed to save vault file: {str(e)}")
    
    def validate_vault_file(self, file_path: str) -> Dict[str, Any]:
        """验证Vault文件"""
        try:
            if not os.path.exists(file_path):
                return {'valid': False, 'error': 'File not found'}
            
            with open(file_path, 'r') as f:
                content = f.read()
            
            if content.startswith('$ANSIBLE_VAULT;'):
                try:
                    self.decrypt_string(content)
                    return {'valid': True, 'encrypted': True}
                except Exception as e:
                    return {'valid': False, 'error': f'Invalid vault format: {str(e)}'}
            else:
                return {'valid': True, 'encrypted': False}
        except Exception as e:
            return {'valid': False, 'error': str(e)}
    
    def list_vault_files(self, directory: str) -> List[Dict[str, Any]]:
        """列出目录中的Vault文件"""
        try:
            vault_files = []
            
            if not os.path.exists(directory):
                return vault_files
            
            for root, dirs, files in os.walk(directory):
                for file in files:
                    file_path = os.path.join(root, file)
                    relative_path = os.path.relpath(file_path, directory)
                    
                    # 检查文件是否是Vault文件
                    validation = self.validate_vault_file(file_path)
                    
                    vault_files.append({
                        'path': relative_path,
                        'full_path': file_path,
                        'is_encrypted': validation.get('encrypted', False),
                        'is_valid': validation.get('valid', False),
                        'size': os.path.getsize(file_path),
                        'modified': os.path.getmtime(file_path)
                    })
            
            return vault_files
        except Exception as e:
            raise Exception(f"Failed to list vault files: {str(e)}")
    
    def rekey_vault_file(self, file_path: str, new_password: Optional[str] = None) -> str:
        """重新加密Vault文件（更换密钥）"""
        try:
            # 解密文件内容
            with open(file_path, 'r') as f:
                encrypted_content = f.read()
            
            decrypted_content = self.decrypt_string(encrypted_content)
            
            # 如果提供了新密码，临时更新密码文件
            if new_password:
                old_password = self._get_vault_password()
                with open(self.vault_password_file, 'w') as f:
                    f.write(new_password)
                
                try:
                    # 使用新密码重新加密
                    new_encrypted_content = self.encrypt_string(decrypted_content)
                    
                    with open(file_path, 'w') as f:
                        f.write(new_encrypted_content)
                    
                    return file_path
                except Exception as e:
                    # 如果失败，恢复原密码
                    with open(self.vault_password_file, 'w') as f:
                        f.write(old_password)
                    raise e
            else:
                # 使用当前密码重新加密
                new_encrypted_content = self.encrypt_string(decrypted_content)
                
                with open(file_path, 'w') as f:
                    f.write(new_encrypted_content)
                
                return file_path
        except Exception as e:
            raise Exception(f"Failed to rekey vault file: {str(e)}")
    
    def get_vault_info(self) -> Dict[str, Any]:
        """获取Vault配置信息"""
        try:
            return {
                'vault_password_file': self.vault_password_file,
                'vault_key_file': self.vault_key_file,
                'password_file_exists': os.path.exists(self.vault_password_file),
                'key_file_exists': os.path.exists(self.vault_key_file),
                'vault_version': '1.1',  # Ansible Vault版本
                'encryption_algorithm': 'AES256'
            }
        except Exception as e:
            raise Exception(f"Failed to get vault info: {str(e)}")