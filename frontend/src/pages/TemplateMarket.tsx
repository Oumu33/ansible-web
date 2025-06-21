import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Input,
  Select,
  Tag,
  Rate,
  Modal,
  Typography,
  Space,
  Divider,
  Avatar,
  Tooltip,
  Badge,
  Empty,
  Spin,
  message,
  Tabs,
  List,
  Comment,
  Form,
  Drawer,
  Alert,
  Statistic
} from 'antd';
import {
  DownloadOutlined,
  EyeOutlined,
  StarOutlined,
  StarFilled,
  HeartOutlined,
  HeartFilled,
  ShareAltOutlined,
  CodeOutlined,
  UserOutlined,
  CalendarOutlined,
  TagOutlined,
  SearchOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  FireOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  LikeOutlined,
  DislikeOutlined,
  CommentOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../store';
import { 
  fetchTemplates, 
  downloadTemplate, 
  rateTemplate, 
  favoriteTemplate, 
  unfavoriteTemplate,
  getTemplateComments,
  addTemplateComment
} from '../store/slices/templateSlice';
import type { Playbook, TemplateRating, TemplateComment } from '../types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Search } = Input;
const { Option } = Select;
const { Text, Title, Paragraph } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;

interface TemplateFilter {
  category?: string;
  difficulty?: string;
  rating?: number;
  searchText?: string;
  sortBy?: 'rating' | 'downloads' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

const TemplateMarket: React.FC = () => {
  const dispatch = useAppDispatch();
  const { templates, loading, error } = useAppSelector(state => state.templates);
  const { user } = useAppSelector(state => state.auth);
  
  const [selectedTemplate, setSelectedTemplate] = useState<Playbook | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isUploadDrawerVisible, setIsUploadDrawerVisible] = useState(false);
  const [filters, setFilters] = useState<TemplateFilter>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [templateComments, setTemplateComments] = useState<TemplateComment[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [form] = Form.useForm();

  const categories = [
    { value: 'system', label: '系统管理', icon: '🖥️' },
    { value: 'web', label: 'Web服务', icon: '🌐' },
    { value: 'database', label: '数据库', icon: '🗄️' },
    { value: 'container', label: '容器化', icon: '📦' },
    { value: 'security', label: '安全配置', icon: '🔒' },
    { value: 'monitoring', label: '监控部署', icon: '📊' },
    { value: 'backup', label: '备份恢复', icon: '💾' },
    { value: 'network', label: '网络配置', icon: '🌐' },
    { value: 'general', label: '通用工具', icon: '🔧' }
  ];

  const difficulties = [
    { value: 'beginner', label: '初级', color: 'green' },
    { value: 'intermediate', label: '中级', color: 'orange' },
    { value: 'advanced', label: '高级', color: 'red' }
  ];

  useEffect(() => {
    dispatch(fetchTemplates());
  }, [dispatch]);

  const applyFilters = () => {
    let filteredTemplates = [...templates];

    if (filters.category) {
      filteredTemplates = filteredTemplates.filter(t => t.category === filters.category);
    }

    if (filters.difficulty) {
      filteredTemplates = filteredTemplates.filter(t => t.difficulty === filters.difficulty);
    }

    if (filters.rating) {
      filteredTemplates = filteredTemplates.filter(t => t.rating >= filters.rating);
    }

    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filteredTemplates = filteredTemplates.filter(t => 
        t.name.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower) ||
        t.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // 排序
    if (filters.sortBy) {
      filteredTemplates.sort((a, b) => {
        let aValue, bValue;
        
        switch (filters.sortBy) {
          case 'rating':
            aValue = a.rating || 0;
            bValue = b.rating || 0;
            break;
          case 'downloads':
            aValue = a.download_count || 0;
            bValue = b.download_count || 0;
            break;
          case 'created_at':
            aValue = new Date(a.created_at).getTime();
            bValue = new Date(b.created_at).getTime();
            break;
          case 'updated_at':
            aValue = new Date(a.updated_at).getTime();
            bValue = new Date(b.updated_at).getTime();
            break;
          default:
            return 0;
        }
        
        if (filters.sortOrder === 'desc') {
          return bValue - aValue;
        }
        return aValue - bValue;
      });
    }

    return filteredTemplates;
  };

  const handleViewTemplate = async (template: Playbook) => {
    setSelectedTemplate(template);
    setUserRating(0);
    setUserComment('');
    
    try {
      const comments = await dispatch(getTemplateComments(template.id)).unwrap();
      setTemplateComments(comments);
    } catch (error) {
      console.error('获取评论失败:', error);
    }
    
    setIsDetailModalVisible(true);
  };

  const handleDownloadTemplate = async (template: Playbook) => {
    try {
      await dispatch(downloadTemplate(template.id)).unwrap();
      message.success(`模板 "${template.name}" 下载成功`);
    } catch (error) {
      message.error('下载失败: ' + (error as Error).message);
    }
  };

  const handleRateTemplate = async (rating: number) => {
    if (!selectedTemplate) return;
    
    try {
      await dispatch(rateTemplate({ 
        templateId: selectedTemplate.id, 
        rating,
        comment: userComment 
      })).unwrap();
      
      setUserRating(rating);
      message.success('评分提交成功');
      
      // 刷新评论列表
      const comments = await dispatch(getTemplateComments(selectedTemplate.id)).unwrap();
      setTemplateComments(comments);
    } catch (error) {
      message.error('评分失败: ' + (error as Error).message);
    }
  };

  const handleToggleFavorite = async (template: Playbook) => {
    try {
      if (favorites.includes(template.id)) {
        await dispatch(unfavoriteTemplate(template.id)).unwrap();
        setFavorites(favorites.filter(id => id !== template.id));
        message.success('已取消收藏');
      } else {
        await dispatch(favoriteTemplate(template.id)).unwrap();
        setFavorites([...favorites, template.id]);
        message.success('收藏成功');
      }
    } catch (error) {
      message.error('操作失败: ' + (error as Error).message);
    }
  };

  const handleAddComment = async () => {
    if (!selectedTemplate || !userComment.trim()) {
      message.warning('请输入评论内容');
      return;
    }
    
    try {
      await dispatch(addTemplateComment({
        templateId: selectedTemplate.id,
        comment: userComment
      })).unwrap();
      
      setUserComment('');
      message.success('评论提交成功');
      
      // 刷新评论列表
      const comments = await dispatch(getTemplateComments(selectedTemplate.id)).unwrap();
      setTemplateComments(comments);
    } catch (error) {
      message.error('评论失败: ' + (error as Error).message);
    }
  };

  const handleShareTemplate = (template: Playbook) => {
    const url = `${window.location.origin}/templates/${template.id}`;
    navigator.clipboard.writeText(url);
    message.success('分享链接已复制到剪贴板');
  };

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.value === category);
    return cat?.icon || '📄';
  };

  const getDifficultyColor = (difficulty: string) => {
    const diff = difficulties.find(d => d.value === difficulty);
    return diff?.color || 'default';
  };

  const filteredTemplates = applyFilters();

  const renderTemplateCard = (template: Playbook) => (
    <Card
      key={template.id}
      hoverable
      style={{ height: '100%' }}
      cover={
        <div style={{ 
          height: 120, 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '48px'
        }}>
          {getCategoryIcon(template.category)}
        </div>
      }
      actions={[
        <Tooltip title="查看详情">
          <EyeOutlined onClick={() => handleViewTemplate(template)} />
        </Tooltip>,
        <Tooltip title="下载模板">
          <DownloadOutlined onClick={() => handleDownloadTemplate(template)} />
        </Tooltip>,
        <Tooltip title={favorites.includes(template.id) ? '取消收藏' : '收藏'}>
          {favorites.includes(template.id) ? 
            <HeartFilled style={{ color: '#ff4d4f' }} onClick={() => handleToggleFavorite(template)} /> :
            <HeartOutlined onClick={() => handleToggleFavorite(template)} />
          }
        </Tooltip>,
        <Tooltip title="分享">
          <ShareAltOutlined onClick={() => handleShareTemplate(template)} />
        </Tooltip>
      ]}
    >
      <Card.Meta
        title={
          <div>
            <div style={{ marginBottom: 8 }}>
              {template.name}
              <Tag 
                color={getDifficultyColor(template.difficulty)} 
                style={{ marginLeft: 8, fontSize: '10px' }}
              >
                {difficulties.find(d => d.value === template.difficulty)?.label}
              </Tag>
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              <Space>
                <Rate disabled defaultValue={template.rating} style={{ fontSize: '12px' }} />
                <span>({template.rating?.toFixed(1) || '0.0'})</span>
              </Space>
            </div>
          </div>
        }
        description={
          <div>
            <Paragraph 
              ellipsis={{ rows: 2 }} 
              style={{ marginBottom: 8, minHeight: 40 }}
            >
              {template.description}
            </Paragraph>
            <div style={{ marginBottom: 8 }}>
              {template.tags?.slice(0, 3).map(tag => (
                <Tag key={tag} size="small">{tag}</Tag>
              ))}
              {template.tags && template.tags.length > 3 && (
                <Tag size="small">+{template.tags.length - 3}</Tag>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              <Space>
                <span><DownloadOutlined /> {template.download_count || 0}</span>
                <span><CalendarOutlined /> {dayjs(template.created_at).fromNow()}</span>
              </Space>
            </div>
          </div>
        }
      />
    </Card>
  );

  const renderTemplateList = (template: Playbook) => (
    <Card key={template.id} style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col span={2}>
          <div style={{ 
            width: 60, 
            height: 60, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}>
            {getCategoryIcon(template.category)}
          </div>
        </Col>
        <Col span={16}>
          <div>
            <Title level={4} style={{ marginBottom: 8 }}>
              {template.name}
              <Tag 
                color={getDifficultyColor(template.difficulty)} 
                style={{ marginLeft: 8 }}
              >
                {difficulties.find(d => d.value === template.difficulty)?.label}
              </Tag>
            </Title>
            <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 8 }}>
              {template.description}
            </Paragraph>
            <Space>
              <Rate disabled defaultValue={template.rating} style={{ fontSize: '14px' }} />
              <span>({template.rating?.toFixed(1) || '0.0'})</span>
              <Divider type="vertical" />
              <span><DownloadOutlined /> {template.download_count || 0}</span>
              <Divider type="vertical" />
              <span><CalendarOutlined /> {dayjs(template.created_at).fromNow()}</span>
            </Space>
          </div>
        </Col>
        <Col span={6}>
          <div style={{ textAlign: 'right' }}>
            <Space direction="vertical">
              <div>
                {template.tags?.slice(0, 4).map(tag => (
                  <Tag key={tag} size="small">{tag}</Tag>
                ))}
              </div>
              <Space>
                <Button 
                  type="primary" 
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownloadTemplate(template)}
                >
                  下载
                </Button>
                <Button 
                  icon={<EyeOutlined />}
                  onClick={() => handleViewTemplate(template)}
                >
                  查看
                </Button>
                <Button 
                  type={favorites.includes(template.id) ? 'primary' : 'default'}
                  icon={favorites.includes(template.id) ? <HeartFilled /> : <HeartOutlined />}
                  onClick={() => handleToggleFavorite(template)}
                />
              </Space>
            </Space>
          </div>
        </Col>
      </Row>
    </Card>
  );

  return (
    <div>
      {/* 顶部统计 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="模板总数"
              value={templates.length}
              prefix={<CodeOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="热门模板"
              value={templates.filter(t => (t.download_count || 0) > 100).length}
              prefix={<FireOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="高评分模板"
              value={templates.filter(t => (t.rating || 0) >= 4).length}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="我的收藏"
              value={favorites.length}
              prefix={<HeartFilled />}
            />
          </Card>
        </Col>
      </Row>

      {/* 搜索和筛选 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Search
              placeholder="搜索模板名称、描述或标签..."
              value={filters.searchText}
              onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
              onSearch={(value) => setFilters({ ...filters, searchText: value })}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="分类"
              value={filters.category}
              onChange={(category) => setFilters({ ...filters, category })}
              style={{ width: '100%' }}
              allowClear
            >
              {categories.map(cat => (
                <Option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={3}>
            <Select
              placeholder="难度"
              value={filters.difficulty}
              onChange={(difficulty) => setFilters({ ...filters, difficulty })}
              style={{ width: '100%' }}
              allowClear
            >
              {difficulties.map(diff => (
                <Option key={diff.value} value={diff.value}>
                  <Tag color={diff.color}>{diff.label}</Tag>
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={3}>
            <Select
              placeholder="评分"
              value={filters.rating}
              onChange={(rating) => setFilters({ ...filters, rating })}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value={4}>4星以上</Option>
              <Option value={3}>3星以上</Option>
              <Option value={2}>2星以上</Option>
              <Option value={1}>1星以上</Option>
            </Select>
          </Col>
          <Col span={3}>
            <Select
              placeholder="排序"
              value={filters.sortBy}
              onChange={(sortBy) => setFilters({ ...filters, sortBy })}
              style={{ width: '100%' }}
            >
              <Option value="rating">评分</Option>
              <Option value="downloads">下载量</Option>
              <Option value="created_at">创建时间</Option>
              <Option value="updated_at">更新时间</Option>
            </Select>
          </Col>
          <Col span={3}>
            <Space>
              <Button
                type={viewMode === 'grid' ? 'primary' : 'default'}
                onClick={() => setViewMode('grid')}
              >
                网格
              </Button>
              <Button
                type={viewMode === 'list' ? 'primary' : 'default'}
                onClick={() => setViewMode('list')}
              >
                列表
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 模板列表 */}
      <Spin spinning={loading}>
        {filteredTemplates.length === 0 ? (
          <Empty description="暂无模板" />
        ) : (
          <div>
            {viewMode === 'grid' ? (
              <Row gutter={[16, 16]}>
                {filteredTemplates.map(template => (
                  <Col key={template.id} xs={24} sm={12} md={8} lg={6}>
                    {renderTemplateCard(template)}
                  </Col>
                ))}
              </Row>
            ) : (
              <div>
                {filteredTemplates.map(template => renderTemplateList(template))}
              </div>
            )}
          </div>
        )}
      </Spin>

      {/* 模板详情模态框 */}
      <Modal
        title={selectedTemplate?.name}
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={[
          <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={() => selectedTemplate && handleDownloadTemplate(selectedTemplate)}>
            下载模板
          </Button>,
          <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={1000}
      >
        {selectedTemplate && (
          <Tabs defaultActiveKey="info">
            <TabPane tab="基本信息" key="info">
              <Row gutter={16}>
                <Col span={16}>
                  <div style={{ marginBottom: 16 }}>
                    <Title level={4}>{selectedTemplate.name}</Title>
                    <Space>
                      <Tag color={getDifficultyColor(selectedTemplate.difficulty)}>
                        {difficulties.find(d => d.value === selectedTemplate.difficulty)?.label}
                      </Tag>
                      <Tag>{categories.find(c => c.value === selectedTemplate.category)?.label}</Tag>
                      <Rate disabled defaultValue={selectedTemplate.rating} />
                      <span>({selectedTemplate.rating?.toFixed(1) || '0.0'})</span>
                    </Space>
                  </div>
                  
                  <Paragraph>{selectedTemplate.description}</Paragraph>
                  
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>标签: </Text>
                    {selectedTemplate.tags?.map(tag => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
                  
                  <div style={{ marginBottom: 16 }}>
                    <Space>
                      <span><DownloadOutlined /> 下载: {selectedTemplate.download_count || 0}</span>
                      <span><CalendarOutlined /> 创建: {dayjs(selectedTemplate.created_at).format('YYYY-MM-DD')}</span>
                      <span><ClockCircleOutlined /> 更新: {dayjs(selectedTemplate.updated_at).fromNow()}</span>
                    </Space>
                  </div>
                </Col>
                <Col span={8}>
                  <Card title="评分" size="small">
                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                      <Rate 
                        value={userRating} 
                        onChange={setUserRating}
                        style={{ fontSize: '20px' }}
                      />
                      <div style={{ marginTop: 8 }}>
                        <TextArea
                          value={userComment}
                          onChange={(e) => setUserComment(e.target.value)}
                          placeholder="写下您的评价..."
                          rows={3}
                        />
                      </div>
                      <Button 
                        type="primary" 
                        size="small" 
                        style={{ marginTop: 8 }}
                        onClick={() => handleRateTemplate(userRating)}
                        disabled={userRating === 0}
                      >
                        提交评分
                      </Button>
                    </div>
                  </Card>
                </Col>
              </Row>
            </TabPane>
            
            <TabPane tab="代码预览" key="code">
              <pre style={{
                background: '#f5f5f5',
                padding: 16,
                borderRadius: 4,
                maxHeight: 500,
                overflow: 'auto',
                fontSize: '12px',
                lineHeight: '1.4'
              }}>
                {selectedTemplate.content}
              </pre>
            </TabPane>
            
            <TabPane tab={`评论 (${templateComments.length})`} key="comments">
              <div style={{ marginBottom: 16 }}>
                <TextArea
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                  placeholder="写下您的评论..."
                  rows={3}
                />
                <div style={{ marginTop: 8, textAlign: 'right' }}>
                  <Button type="primary" onClick={handleAddComment}>
                    发表评论
                  </Button>
                </div>
              </div>
              
              <Divider />
              
              <List
                dataSource={templateComments}
                renderItem={(comment) => (
                  <Comment
                    author={comment.user?.username || '匿名用户'}
                    avatar={<Avatar icon={<UserOutlined />} />}
                    content={comment.comment}
                    datetime={dayjs(comment.created_at).fromNow()}
                    actions={[
                      <span key="like">
                        <LikeOutlined /> {comment.likes || 0}
                      </span>,
                      <span key="dislike">
                        <DislikeOutlined /> {comment.dislikes || 0}
                      </span>
                    ]}
                  />
                )}
              />
            </TabPane>
          </Tabs>
        )}
      </Modal>
    </div>
  );
};

export default TemplateMarket;