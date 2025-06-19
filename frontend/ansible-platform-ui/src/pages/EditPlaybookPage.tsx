import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPlaybookById, updatePlaybook, Playbook, PlaybookFormData } from '../services/playbookService';
import PlaybookForm from '../components/playbooks/PlaybookForm';

const EditPlaybookPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [playbook, setPlaybook] = useState<Playbook | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaybookDetails = useCallback(async (playbookId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPlaybookById(playbookId);
      setPlaybook(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch playbook details.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchPlaybookDetails(parseInt(id, 10));
    } else {
      setError("No Playbook ID provided.");
      setIsLoading(false);
    }
  }, [id, fetchPlaybookDetails]);

  const handleUpdateSubmit = async (data: PlaybookFormData) => {
    if (!id) return;
    try {
      await updatePlaybook(parseInt(id, 10), data);
      navigate('/playbooks');
    } catch (err: any) {
      console.error("Update playbook failed:", err);
      throw err;
    }
  };

  if (isLoading) return <div style={{padding: '20px'}}>Loading playbook details...</div>;
  if (error && !playbook) return <div style={{padding: '20px'}}><p style={{color: 'red'}}>{error}</p><button onClick={() => navigate('/playbooks')}>Back to List</button></div>;
  if (!playbook) return <div style={{padding: '20px'}}>Playbook not found. <button onClick={() => navigate('/playbooks')}>Back to List</button></div>;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
      <h2 style={{marginBottom: '20px'}}>Edit Playbook: {playbook.name}</h2>
      <PlaybookForm
        onSubmit={handleUpdateSubmit}
        initialData={playbook}
        submitButtonText="Update Playbook"
        onCancel={() => navigate('/playbooks')}
      />
    </div>
  );
};

export default EditPlaybookPage;
