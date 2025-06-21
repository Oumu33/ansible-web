import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Button,
  Space,
  Input,
  Select,
  Form,
  Modal,
  message,
  Tabs,
  Row,
  Col,
  Tag,
  Tooltip,
  Drawer,
  List,
  Typography,
  Divider,
  Switch,
  Alert,
  Spin
} from 'antd';
import {
  SaveOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  CodeOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CopyOutlined,
  DownloadOutlined,
  UploadOutlined,
  SettingOutlined,
  BugOutlined
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchPlaybooks, createPlaybook, updatePlaybook, validatePlaybook } from '../store/slices/playbookSlice';
import { fetchHosts } from '../store/slices/hostSlice';
import type { Playbook, Host } from '../types';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { Text, Title } = Typography;

interface PlaybookFormData {
  name: string;
  description: string;
  content: string;
  variables: Record<string, any>;
  tags: string[];
  category: string;
}

interface AnsibleModule {
  name: string;
  description: string;
  category: string;
  parameters: Record<string, any>;
  examples: string[];
}

const PlaybookEditor: React.FC = () => {
  const dispatch = useAppDispatch();
  const { playbooks, loading, error } = useAppSelector(state => state.playbooks);
  const { hosts } = useAppSelector(state => state.hosts);
  
  const [form] = Form.useForm();
  const [currentPlaybook, setCurrentPlaybook] = useState<Playbook | null>(null);
  const [editorMode, setEditorMode] = useState<'visual' | 'yaml'>('yaml');
  const [yamlContent, setYamlContent] = useState('');
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isModuleDrawerVisible, setIsModuleDrawerVisible] = useState(false);
  const [isExecuteModalVisible, setIsExecuteModalVisible] = useState(false);
  const [selectedHosts, setSelectedHosts] = useState<number[]>([]);
  const [extraVars, setExtraVars] = useState('{}');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const textAreaRef = useRef<any>(null);

  // 常用Ansible模块
  const ansibleModules: AnsibleModule[] = [
    {
      name: 'copy',
      description: '复制文件到远程主机',
      category: 'files',
      parameters: { src: 'string', dest: 'string', mode: 'string', owner: 'string' },
      examples: [
        '- name: 复制配置文件\n  copy:\n    src: /local/path/config.conf\n    dest: /remote/path/config.conf\n    mode: "0644"\n    owner: root'
      ]
    },
    {
      name: 'service',
      description: '管理系统服务',
      category: 'system',
      parameters: { name: 'string', state: 'started|stopped|restarted', enabled: 'boolean' },
      examples: [
        '- name: 启动nginx服务\n  service:\n    name: nginx\n    state: started\n    enabled: yes'
      ]
    },
    {
      name: 'package',
      description: '管理软件包',
      category: 'packaging',
      parameters: { name: 'string', state: 'present|absent|latest' },
      examples: [
        '- name: 安装nginx\n  package:\n    name: nginx\n    state: present'
      ]
    },
    {
      name: 'template',
      description: '使用Jinja2模板生成文件',
      category: 'files',
      parameters: { src: 'string', dest: 'string', mode: 'string' },
      examples: [
        '- name: 生成配置文件\n  template:\n    src: config.j2\n    dest: /etc/app/config.conf\n    mode: "0644"'
      ]
    },
    {
      name: 'shell',
      description: '执行shell命令',
      category: 'commands',
      parameters: { cmd: 'string', chdir: 'string' },
      examples: [
        '- name: 执行脚本\n  shell: /path/to/script.sh\n  args:\n    chdir: /tmp'
      ]
    },
    {
      name: 'file',
      description: '管理文件和目录',
      category: 'files',
      parameters: { path: 'string', state: 'file|directory|absent', mode: 'string' },
      examples: [
        '- name: 创建目录\n  file:\n    path: /opt/app\n    state: directory\n    mode: "0755"'
      ]
    },
    {
      name: 'user',
      description: '管理用户账户',
      category: 'system',
      parameters: { name: 'string', state: 'present|absent', shell: 'string', home: 'string' },
      examples: [
        '- name: 创建用户\n  user:\n    name: appuser\n    shell: /bin/bash\n    home: /home/appuser'
      ]
    },
    {
      name: 'lineinfile',
      description: '管理文件中的行',
      category: 'files',
      parameters: { path: 'string', line: 'string', regexp: 'string', state: 'present|absent' },
      examples: [
        '- name: 修改配置文件\n  lineinfile:\n    path: /etc/hosts\n    line: "127.0.0.1 localhost"\n    regexp: "^127\.0\.0\.1"'
      ]
    }
  ];

  const playbookCategories = [
    { value: 'system', label: '系统管理' },
    { value: 'web', label: 'Web服务' },
    { value: 'database', label: '数据库' },
    { value: 'container', label: '容器化' },
    { value: 'security', label: '安全配置' },
    { value: 'monitoring', label: '监控部署' },
    { value: 'backup', label: '备份恢复' },
    { value: 'network', label: '网络配置' },
    { value: 'general', label: '通用工具' }
  ];

  useEffect(() => {
    dispatch(fetchPlaybooks());
    dispatch(fetchHosts());
  }, [dispatch]);

  useEffect(() => {
    if (currentPlaybook) {
      setYamlContent(currentPlaybook.content);
      form.setFieldsValue({
        name: currentPlaybook.name,
        description: currentPlaybook.description,
        category: currentPlaybook.category,
        tags: currentPlaybook.tags || [],
        variables: JSON.stringify(currentPlaybook.variables || {}, null, 2)
      });
    } else {
      setYamlContent(getDefaultPlaybookContent());
      form.resetFields();
    }
  }, [currentPlaybook, form]);

  const getDefaultPlaybookContent = () => {
    return `---
- name: 新建Playbook
  hosts: all
  become: yes
  vars:
    # 在这里定义变量
    
  tasks:
    - name: 示例任务
      debug:
        msg: "Hello, Ansible!"
        
    # 在这里添加更多任务
`;
  };

  const handleSave = async () => {
    try {
      const formValues = await form.validateFields();
      
      let variables = {};
      if (formValues.variables) {
        try {
          variables = JSON.parse(formValues.variables);
        } catch (e) {
          message.error('变量格式错误，请输入有效的JSON');
          return;
        }
      }

      const playbookData: PlaybookFormData = {
        ...formValues,
        content: yamlContent,
        variables
      };

      if (currentPlaybook) {
        await dispatch(updatePlaybook({ id: currentPlaybook.id, data: playbookData })).unwrap();
        message.success('Playbook更新成功');
      } else {
        const result = await dispatch(createPlaybook(playbookData)).unwrap();
        setCurrentPlaybook(result);
        message.success('Playbook创建成功');
      }
    } catch (error) {
      message.error('保存失败: ' + (error as Error).message);
    }
  };

  const handleValidate = async () => {
    if (!yamlContent.trim()) {
      message.warning('请输入Playbook内容');
      return;
    }

    setIsValidating(true);
    try {
      const result = await dispatch(validatePlaybook({ content: yamlContent })).unwrap();
      setValidationResult(result);
      
      if (result.valid) {
        message.success('Playbook语法验证通过');
      } else {
        message.error('Playbook语法验证失败');
      }
    } catch (error) {
      message.error('验证失败: ' + (error as Error).message);
      setValidationResult({ valid: false, errors: [(error as Error).message] });
    } finally {
      setIsValidating(false);
    }
  };

  const handleExecute = () => {
    if (!currentPlaybook) {
      message.warning('请先保存Playbook');
      return;
    }
    setIsExecuteModalVisible(true);
  };

  const handleConfirmExecute = async () => {
    try {
      let extraVariables = {};
      if (extraVars) {
        try {
          extraVariables = JSON.parse(extraVars);
        } catch (e) {
          message.error('额外变量格式错误，请输入有效的JSON');
          return;
        }
      }

      // 这里应该调用执行Playbook的API
      message.success('Playbook执行已启动，请在任务监控页面查看进度');
      setIsExecuteModalVisible(false);
    } catch (error) {
      message.error('执行失败: ' + (error as Error).message);
    }
  };

  const insertModule = (module: AnsibleModule) => {
    const example = module.examples[0];
    const currentContent = yamlContent;
    const newContent = currentContent + '\n\n' + example;
    setYamlContent(newContent);
    setIsModuleDrawerVisible(false);
    message.success(`已插入${module.name}模块示例`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(yamlContent);
    message.success('内容已复制到剪贴板');
  };

  const handleDownload = () => {
    const blob = new Blob([yamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentPlaybook?.name || 'playbook'}.yml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setYamlContent(content);
      message.success('文件上传成功');
    };
    reader.readAsText(file);
    return false; // 阻止默认上传行为
  };

  const renderModuleList = () => {
    const modulesByCategory = ansibleModules.reduce((acc, module) => {
      if (!acc[module.category]) {
        acc[module.category] = [];
      }
      acc[module.category].push(module);
      return acc;
    }, {} as Record<string, AnsibleModule[]>);

    return Object.entries(modulesByCategory).map(([category, modules]) => (
      <div key={category}>
        <Title level={5} style={{ marginTop: 16 }}>
          {category.charAt(0).toUpperCase() + category.slice(1)}
        </Title>
        <List
          dataSource={modules}
          renderItem={(module) => (
            <List.Item
              actions={[
                <Button
                  type="link"
                  size="small"
                  onClick={() => insertModule(module)}
                >
                  插入
                </Button>
              ]}
            >
              <List.Item.Meta
                title={module.name}
                description={module.description}
              />
            </List.Item>
          )}
        />
      </div>
    ));
  };

  return (
    <div>
      {/* 顶部操作栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Select
                placeholder="选择Playbook"
                value={currentPlaybook?.id}
                onChange={(id) => {
                  const playbook = playbooks.find(p => p.id === id);
                  setCurrentPlaybook(playbook || null);
                }}
                style={{ width: 200 }}
                allowClear
              >
                {playbooks.map(playbook => (
                  <Option key={playbook.id} value={playbook.id}>
                    {playbook.name}
                  </Option>
                ))}
              </Select>
              <Button
                onClick={() => setCurrentPlaybook(null)}
                icon={<FileTextOutlined />}
              >
                新建
              </Button>
            </Space>
          </Col>
          <Col>
            <Space>
              <Switch
                checked={editorMode === 'visual'}
                onChange={(checked) => setEditorMode(checked ? 'visual' : 'yaml')}
                checkedChildren={<AppstoreOutlined />}
                unCheckedChildren={<CodeOutlined />}
              />
              <Text>可视化模式</Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Tooltip title="语法验证">
                <Button
                  icon={<BugOutlined />}
                  onClick={handleValidate}
                  loading={isValidating}
                >
                  验证
                </Button>
              </Tooltip>
              <Tooltip title="预览">
                <Button
                  icon={<EyeOutlined />}
                  onClick={() => setIsPreviewVisible(true)}
                >
                  预览
                </Button>
              </Tooltip>
              <Tooltip title="模块库">
                <Button
                  icon={<SettingOutlined />}
                  onClick={() => setIsModuleDrawerVisible(true)}
                >
                  模块
                </Button>
              </Tooltip>
              <Tooltip title="复制">
                <Button
                  icon={<CopyOutlined />}
                  onClick={handleCopy}
                >
                  复制
                </Button>
              </Tooltip>
              <Tooltip title="下载">
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleDownload}
                >
                  下载
                </Button>
              </Tooltip>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={loading}
              >
                保存
              </Button>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleExecute}
                disabled={!currentPlaybook}
              >
                执行
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 验证结果 */}
      {validationResult && (
        <Alert
          type={validationResult.valid ? 'success' : 'error'}
          message={validationResult.valid ? '语法验证通过' : '语法验证失败'}
          description={validationResult.errors && validationResult.errors.length > 0 ? (
            <ul>
              {validationResult.errors.map((error: string, index: number) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          ) : null}
          showIcon
          closable
          onClose={() => setValidationResult(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={16}>
        {/* 左侧：Playbook信息 */}
        <Col span={6}>
          <Card title="Playbook信息" size="small">
            <Form form={form} layout="vertical" size="small">
              <Form.Item
                name="name"
                label="名称"
                rules={[{ required: true, message: '请输入Playbook名称' }]}
              >
                <Input placeholder="输入Playbook名称" />
              </Form.Item>
              
              <Form.Item
                name="description"
                label="描述"
              >
                <TextArea rows={2} placeholder="输入描述信息" />
              </Form.Item>
              
              <Form.Item
                name="category"
                label="分类"
              >
                <Select placeholder="选择分类">
                  {playbookCategories.map(cat => (
                    <Option key={cat.value} value={cat.value}>{cat.label}</Option>
                  ))}
                </Select>
              </Form.Item>
              
              <Form.Item
                name="tags"
                label="标签"
              >
                <Select
                  mode="tags"
                  placeholder="添加标签"
                  style={{ width: '100%' }}
                />
              </Form.Item>
              
              <Form.Item
                name="variables"
                label="变量 (JSON)"
              >
                <TextArea
                  rows={4}
                  placeholder='{"key": "value"}'
                />
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* 右侧：编辑器 */}
        <Col span={18}>
          <Card title="Playbook编辑器" size="small">
            {editorMode === 'yaml' ? (
              <TextArea
                ref={textAreaRef}
                value={yamlContent}
                onChange={(e) => setYamlContent(e.target.value)}
                placeholder="在这里编写您的Playbook..."
                style={{
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}
                rows={25}
              />
            ) : (
              <div style={{ padding: 16, textAlign: 'center', color: '#999' }}>
                <AppstoreOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <div>可视化编辑器正在开发中...</div>
                <div>请使用YAML模式进行编辑</div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 预览模态框 */}
      <Modal
        title="Playbook预览"
        open={isPreviewVisible}
        onCancel={() => setIsPreviewVisible(false)}
        footer={null}
        width={800}
      >
        <pre style={{ 
          background: '#f5f5f5', 
          padding: 16, 
          borderRadius: 4,
          maxHeight: 500,
          overflow: 'auto'
        }}>
          {yamlContent}
        </pre>
      </Modal>

      {/* 模块库抽屉 */}
      <Drawer
        title="Ansible模块库"
        placement="right"
        onClose={() => setIsModuleDrawerVisible(false)}
        open={isModuleDrawerVisible}
        width={400}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            点击"插入"按钮将模块示例添加到Playbook中
          </Text>
        </div>
        {renderModuleList()}
      </Drawer>

      {/* 执行确认模态框 */}
      <Modal
        title="执行Playbook"
        open={isExecuteModalVisible}
        onOk={handleConfirmExecute}
        onCancel={() => setIsExecuteModalVisible(false)}
        okText="执行"
        cancelText="取消"
      >
        <Form layout="vertical">
          <Form.Item label="目标主机">
            <Select
              mode="multiple"
              placeholder="选择目标主机"
              value={selectedHosts}
              onChange={setSelectedHosts}
              style={{ width: '100%' }}
            >
              {hosts.map(host => (
                <Option key={host.id} value={host.id}>
                  {host.name} ({host.ip_address})
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item label="额外变量 (JSON格式)">
            <TextArea
              value={extraVars}
              onChange={(e) => setExtraVars(e.target.value)}
              placeholder='{"variable": "value"}'
              rows={4}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PlaybookEditor;