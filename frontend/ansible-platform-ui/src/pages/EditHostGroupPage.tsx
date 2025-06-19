import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getHostGroupById, updateHostGroup, HostGroup, HostGroupFormData } from '../services/hostService';
import HostGroupForm from '../components/hosts/HostGroupForm';

const EditHostGroupPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [hostGroup, setHostGroup] = useState<HostGroup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroup = useCallback(async (groupId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getHostGroupById(groupId);
      setHostGroup(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch host group details.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchGroup(parseInt(id, 10));
    } else {
      setError("No Host Group ID provided.");
      setIsLoading(false);
      // navigate('/hostgroups'); // Optionally redirect if no ID
    }
  }, [id, fetchGroup]);

  const handleUpdateSubmit = async (data: HostGroupFormData) => {
    if (!id) return;
    try {
      await updateHostGroup(parseInt(id, 10), data);
      navigate('/hostgroups');
    } catch (err: any) {
      console.error("Update host group failed:", err);
      throw err;
    }
  };

  if (isLoading) return <div style={{padding: '20px'}}>Loading host group details...</div>;
  if (error && !hostGroup) return <div style={{padding: '20px'}}><p style={{color: 'red'}}>{error}</p><button onClick={() => navigate('/hostgroups')}>Back to List</button></div>;
  if (!hostGroup) return <div style={{padding: '20px'}}>Host group not found. <button onClick={() => navigate('/hostgroups')}>Back to List</button></div>;

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: 'auto' }}>
      <h2 style={{marginBottom: '20px'}}>Edit Host Group: {hostGroup.name}</h2>
      <HostGroupForm
        onSubmit={handleUpdateSubmit}
        initialData={hostGroup}
        submitButtonText="Update Group"
        onCancel={() => navigate('/hostgroups')}
      />
    </div>
  );
};

export default EditHostGroupPage;
