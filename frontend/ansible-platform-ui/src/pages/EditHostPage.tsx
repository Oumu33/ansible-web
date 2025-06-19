import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getHostById, updateHost, Host, HostFormData } from '../services/hostService';
import HostForm from '../components/hosts/HostForm';

const EditHostPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [host, setHost] = useState<Host | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHostDetails = useCallback(async (hostId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getHostById(hostId);
      setHost(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch host details.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchHostDetails(parseInt(id, 10));
    } else {
      setError("No Host ID provided.");
      setIsLoading(false);
    }
  }, [id, fetchHostDetails]);

  const handleUpdateSubmit = async (data: HostFormData) => {
    if (!id) return;
    try {
      await updateHost(parseInt(id, 10), data);
      navigate('/hosts');
    } catch (err: any) {
      console.error("Update host failed:", err);
      throw err;
    }
  };

  if (isLoading) return <div style={{padding: '20px'}}>Loading host details...</div>;
  if (error && !host) return <div style={{padding: '20px'}}><p style={{color: 'red'}}>{error}</p><button onClick={() => navigate('/hosts')}>Back to List</button></div>;
  if (!host) return <div style={{padding: '20px'}}>Host not found. <button onClick={() => navigate('/hosts')}>Back to List</button></div>;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
      <h2 style={{marginBottom: '20px'}}>Edit Host: {host.name}</h2>
      <HostForm
        onSubmit={handleUpdateSubmit}
        initialData={host}
        submitButtonText="Update Host"
        onCancel={() => navigate('/hosts')}
      />
    </div>
  );
};

export default EditHostPage;
