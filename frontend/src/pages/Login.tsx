import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Space,
  Divider,
  Alert,
  Checkbox,
  Row,
  Col,
  message,
  Spin,
  Modal,
  Tabs,
  QRCode,
  Steps,
  Result
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  SafetyOutlined,
  MobileOutlined,
  MailOutlined,
  KeyOutlined,
  LoginOutlined,
  UserAddOutlined,
  QuestionCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { login, register, resetPassword, verifyTwoFactor } from '../store/slices/authSlice';
import './Login.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Step } = Steps;

interface LoginFormData {
  username: string;
  password: string;
  remember: boolean;
  captcha?: string;
}

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  fullName?: string;
  agreement: boolean;
}

interface ResetPasswordFormData {
  email: string;
  code?: string;
  newPassword?: string;
  confirmPassword?: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { loading, error, user } = useAppSelector(state => state.auth);
  
  const [activeTab, setActiveTab] = useState('login');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [isTwoFactorModalVisible, setIsTwoFactorModalVisible] = useState(false);
  const [isResetPasswordModalVisible, setIsResetPasswordModalVisible] = useState(false);
  const [resetStep, setResetStep] = useState(0);
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [resetForm] = Form.useForm();
  const [twoFactorForm] = Form.useForm();

  // 从路由状态获取重定向路径
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  useEffect(() => {
    // 如果已经登录，直接跳转
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  useEffect(() => {
    // 倒计时逻辑
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleLogin = async (values: LoginFormData) => {
    try {
      const result = await dispatch(login({
        username: values.username,
        password: values.password,
        remember: values.remember,
        captcha: values.captcha
      })).unwrap();
      
      // 检查是否需要双因子认证
      if (result.requires_2fa) {
        setTempUserId(result.temp_user_id);
        setIsTwoFactorModalVisible(true);
        return;
      }
      
      message.success('登录成功');
      navigate(from, { replace: true });
    } catch (error: any) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      
      // 3次失败后显示验证码
      if (newAttempts >= 3) {
        setShowCaptcha(true);
      }
      
      // 5次失败后锁定账户
      if (newAttempts >= 5) {
        message.error('登录失败次数过多，账户已被锁定，请联系管理员');
      } else {
        message.error(error.message || '登录失败');
      }
    }
  };

  const handleRegister = async (values: RegisterFormData) => {
    try {
      await dispatch(register({
        username: values.username,
        email: values.email,
        password: values.password,
        phone: values.phone,
        profile: {
          full_name: values.fullName
        }
      })).unwrap();
      
      message.success('注册成功，请联系管理员激活账户');
      setActiveTab('login');
    } catch (error: any) {
      message.error(error.message || '注册失败');
    }
  };

  const handleResetPassword = async (values: ResetPasswordFormData) => {
    try {
      if (resetStep === 0) {
        // 发送重置邮件
        await dispatch(resetPassword({ email: values.email })).unwrap();
        message.success('重置邮件已发送，请查收');
        setResetStep(1);
        setCountdown(60);
      } else if (resetStep === 1) {
        // 验证重置码并设置新密码
        await dispatch(resetPassword({
          email: values.email,
          code: values.code,
          newPassword: values.newPassword
        })).unwrap();
        
        message.success('密码重置成功');
        setIsResetPasswordModalVisible(false);
        setResetStep(0);
        setActiveTab('login');
      }
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleTwoFactorVerify = async (values: { code: string }) => {
    try {
      await dispatch(verifyTwoFactor({
        tempUserId: tempUserId!,
        code: values.code
      })).unwrap();
      
      message.success('验证成功，登录完成');
      setIsTwoFactorModalVisible(false);
      navigate(from, { replace: true });
    } catch (error: any) {
      message.error(error.message || '验证失败');
    }
  };

  const handleResendCode = async () => {
    try {
      // 模拟重发验证码
      message.success('验证码已重新发送');
      setCountdown(60);
    } catch (error) {
      message.error('发送失败，请稍后重试');
    }
  };

  const refreshCaptcha = () => {
    // 模拟刷新验证码
    message.info('验证码已刷新');
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-overlay" />
      </div>
      
      <div className="login-content">
        <Row justify="center" align="middle" style={{ minHeight: '100vh' }}>
          <Col xs={22} sm={16} md={12} lg={8} xl={6}>
            <Card className="login-card">
              <div className="login-header">
                <div className="login-logo">
                  <SafetyOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
                </div>
                <Title level={2} style={{ textAlign: 'center', marginBottom: 8 }}>
                  Ansible Web
                </Title>
                <Text type="secondary" style={{ display: 'block', textAlign: 'center' }}>
                  自动化运维管理平台
                </Text>
              </div>

              <Divider />

              {error && (
                <Alert
                  message={error}
                  type="error"
                  showIcon
                  style={{ marginBottom: 16 }}
                  closable
                />
              )}

              <Tabs activeKey={activeTab} onChange={setActiveTab} centered>
                <TabPane tab="登录" key="login">
                  <Form
                    form={loginForm}
                    name="login"
                    onFinish={handleLogin}
                    autoComplete="off"
                    size="large"
                  >
                    <Form.Item
                      name="username"
                      rules={[{ required: true, message: '请输入用户名' }]}
                    >
                      <Input
                        prefix={<UserOutlined />}
                        placeholder="用户名"
                        autoComplete="username"
                      />
                    </Form.Item>

                    <Form.Item
                      name="password"
                      rules={[{ required: true, message: '请输入密码' }]}
                    >
                      <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="密码"
                        autoComplete="current-password"
                        iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                      />
                    </Form.Item>

                    {showCaptcha && (
                      <Form.Item
                        name="captcha"
                        rules={[{ required: true, message: '请输入验证码' }]}
                      >
                        <Row gutter={8}>
                          <Col span={14}>
                            <Input
                              prefix={<SafetyOutlined />}
                              placeholder="验证码"
                            />
                          </Col>
                          <Col span={10}>
                            <div 
                              className="captcha-image"
                              onClick={refreshCaptcha}
                              style={{
                                height: '40px',
                                background: 'linear-gradient(45deg, #f0f0f0, #d9d9d9)',
                                border: '1px solid #d9d9d9',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                color: '#666',
                                userSelect: 'none'
                              }}
                            >
                              A8K9
                            </div>
                          </Col>
                        </Row>
                      </Form.Item>
                    )}

                    <Form.Item>
                      <Row justify="space-between" align="middle">
                        <Col>
                          <Form.Item name="remember" valuePropName="checked" noStyle>
                            <Checkbox>记住我</Checkbox>
                          </Form.Item>
                        </Col>
                        <Col>
                          <Button 
                            type="link" 
                            onClick={() => setIsResetPasswordModalVisible(true)}
                            style={{ padding: 0 }}
                          >
                            忘记密码？
                          </Button>
                        </Col>
                      </Row>
                    </Form.Item>

                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        block
                        icon={<LoginOutlined />}
                      >
                        登录
                      </Button>
                    </Form.Item>
                  </Form>
                </TabPane>

                <TabPane tab="注册" key="register">
                  <Form
                    form={registerForm}
                    name="register"
                    onFinish={handleRegister}
                    autoComplete="off"
                    size="large"
                  >
                    <Form.Item
                      name="username"
                      rules={[
                        { required: true, message: '请输入用户名' },
                        { min: 3, message: '用户名至少3个字符' },
                        { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' }
                      ]}
                    >
                      <Input
                        prefix={<UserOutlined />}
                        placeholder="用户名"
                        autoComplete="username"
                      />
                    </Form.Item>

                    <Form.Item
                      name="email"
                      rules={[
                        { required: true, message: '请输入邮箱' },
                        { type: 'email', message: '请输入有效的邮箱地址' }
                      ]}
                    >
                      <Input
                        prefix={<MailOutlined />}
                        placeholder="邮箱"
                        autoComplete="email"
                      />
                    </Form.Item>

                    <Form.Item
                      name="fullName"
                      rules={[{ required: true, message: '请输入姓名' }]}
                    >
                      <Input
                        prefix={<UserOutlined />}
                        placeholder="姓名"
                        autoComplete="name"
                      />
                    </Form.Item>

                    <Form.Item name="phone">
                      <Input
                        prefix={<MobileOutlined />}
                        placeholder="手机号码（可选）"
                        autoComplete="tel"
                      />
                    </Form.Item>

                    <Form.Item
                      name="password"
                      rules={[
                        { required: true, message: '请输入密码' },
                        { min: 8, message: '密码至少8个字符' },
                        {
                          pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
                          message: '密码必须包含大小写字母和数字'
                        }
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="密码"
                        autoComplete="new-password"
                      />
                    </Form.Item>

                    <Form.Item
                      name="confirmPassword"
                      dependencies={['password']}
                      rules={[
                        { required: true, message: '请确认密码' },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue('password') === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error('两次输入的密码不一致'));
                          },
                        }),
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="确认密码"
                        autoComplete="new-password"
                      />
                    </Form.Item>

                    <Form.Item
                      name="agreement"
                      valuePropName="checked"
                      rules={[
                        {
                          validator: (_, value) =>
                            value ? Promise.resolve() : Promise.reject(new Error('请同意用户协议')),
                        },
                      ]}
                    >
                      <Checkbox>
                        我已阅读并同意 <Button type="link" style={{ padding: 0 }}>用户协议</Button> 和 <Button type="link" style={{ padding: 0 }}>隐私政策</Button>
                      </Checkbox>
                    </Form.Item>

                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        block
                        icon={<UserAddOutlined />}
                      >
                        注册
                      </Button>
                    </Form.Item>
                  </Form>
                </TabPane>
              </Tabs>

              <Divider>
                <Text type="secondary">其他登录方式</Text>
              </Divider>

              <div style={{ textAlign: 'center' }}>
                <Space size="large">
                  <Tooltip title="LDAP登录">
                    <Button shape="circle" icon={<UserOutlined />} />
                  </Tooltip>
                  <Tooltip title="SSO登录">
                    <Button shape="circle" icon={<SafetyOutlined />} />
                  </Tooltip>
                  <Tooltip title="帮助">
                    <Button shape="circle" icon={<QuestionCircleOutlined />} />
                  </Tooltip>
                </Space>
              </div>

              <div className="login-footer">
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  © 2024 Ansible Web管理平台. All rights reserved.
                </Text>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {/* 双因子认证模态框 */}
      <Modal
        title="双因子认证"
        open={isTwoFactorModalVisible}
        onCancel={() => setIsTwoFactorModalVisible(false)}
        footer={null}
        width={400}
        centered
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <SafetyOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
          <Paragraph style={{ marginTop: 16 }}>
            请输入您的身份验证器应用中显示的6位数字代码
          </Paragraph>
        </div>
        
        <Form
          form={twoFactorForm}
          onFinish={handleTwoFactorVerify}
          autoComplete="off"
        >
          <Form.Item
            name="code"
            rules={[
              { required: true, message: '请输入验证码' },
              { len: 6, message: '验证码为6位数字' }
            ]}
          >
            <Input
              placeholder="请输入6位验证码"
              maxLength={6}
              style={{ textAlign: 'center', fontSize: '18px', letterSpacing: '4px' }}
            />
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              验证
            </Button>
          </Form.Item>
          
          <div style={{ textAlign: 'center' }}>
            <Button type="link" onClick={handleResendCode} disabled={countdown > 0}>
              {countdown > 0 ? `重新发送(${countdown}s)` : '重新发送验证码'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 重置密码模态框 */}
      <Modal
        title="重置密码"
        open={isResetPasswordModalVisible}
        onCancel={() => {
          setIsResetPasswordModalVisible(false);
          setResetStep(0);
          resetForm.resetFields();
        }}
        footer={null}
        width={500}
        centered
      >
        <Steps current={resetStep} style={{ marginBottom: 24 }}>
          <Step title="输入邮箱" icon={<MailOutlined />} />
          <Step title="验证重置" icon={<KeyOutlined />} />
          <Step title="完成" icon={<CheckCircleOutlined />} />
        </Steps>
        
        <Form
          form={resetForm}
          onFinish={handleResetPassword}
          autoComplete="off"
          layout="vertical"
        >
          {resetStep === 0 && (
            <>
              <Alert
                message="请输入您的注册邮箱，我们将发送重置链接到您的邮箱"
                type="info"
                style={{ marginBottom: 16 }}
              />
              <Form.Item
                name="email"
                label="邮箱地址"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="请输入注册邮箱" />
              </Form.Item>
            </>
          )}
          
          {resetStep === 1 && (
            <>
              <Alert
                message="请查收邮件并输入重置验证码，然后设置新密码"
                type="info"
                style={{ marginBottom: 16 }}
              />
              <Form.Item
                name="code"
                label="验证码"
                rules={[{ required: true, message: '请输入验证码' }]}
              >
                <Input prefix={<KeyOutlined />} placeholder="请输入邮件中的验证码" />
              </Form.Item>
              
              <Form.Item
                name="newPassword"
                label="新密码"
                rules={[
                  { required: true, message: '请输入新密码' },
                  { min: 8, message: '密码至少8个字符' }
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="请输入新密码" />
              </Form.Item>
              
              <Form.Item
                name="confirmPassword"
                label="确认密码"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: '请确认新密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="请确认新密码" />
              </Form.Item>
              
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <Button type="link" onClick={handleResendCode} disabled={countdown > 0}>
                  {countdown > 0 ? `重新发送(${countdown}s)` : '重新发送验证码'}
                </Button>
              </div>
            </>
          )}
          
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {resetStep === 0 ? '发送重置邮件' : '重置密码'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Login;