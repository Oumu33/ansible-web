import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom'; // useNavigate removed as not used directly here
import { getPlaybooks, createPlaybook, deletePlaybook, Playbook, PlaybookFormData } from '../services/playbookService';
import PlaybookForm from '../components/playbooks/PlaybookForm';

const styles: { [key: string]: React.CSSProperties } = {
  page: { padding: '20px', maxWidth: '900px', margin: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  list: { listStyle: 'none', padding: 0, marginTop: '20px' },
  listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '10px', backgroundColor: '#fff', gap: '10px' },
  listItemContent: { flexGrow: 1, overflow: 'hidden' },
  listItemName: { fontWeight: 'bold', fontSize: '1.1em', color: '#333' },
  descriptionText: { fontSize: '0.9em', color: '#555', margin: '5px 0 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '60px', overflowY: 'auto' },
  actions: { display: 'flex', gap: '10px', flexShrink: 0 },
  button: { padding: '6px 12px', textDecoration: 'none', border: '1px solid transparent', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em', whiteSpace: 'nowrap' },
  editButton: { backgroundColor: '#ffc107', color: 'black' },
  deleteButton: { backgroundColor: '#dc3545', color: 'white' },
  createButton: { backgroundColor: '#28a745', color: 'white' },
  formContainer: { marginTop: '20px', marginBottom: '30px', padding: '25px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }
};

const PlaybooksPage: React.FC = () => {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchPlaybooksList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPlaybooks();
      setPlaybooks(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch playbooks.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaybooksList();
  }, [fetchPlaybooksList]);

  const handleCreateSubmit = async (data: PlaybookFormData) => {
    try {
      await createPlaybook(data);
      fetchPlaybooksList();
      setShowCreateForm(false);
    } catch (err: any) {
      console.error("Create playbook failed:", err);
      throw err;
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this playbook? This action cannot be undone.')) {
      try {
        await deletePlaybook(id);
        fetchPlaybooksList();
      } catch (err: any) {
        setError(err.message || 'Failed to delete playbook.');
        console.error(err);
      }
    }
  };

  if (isLoading && playbooks.length === 0) return <div style={styles.page}>Loading playbooks...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2>Playbooks</h2>
        <button
          onClick={() => { setShowCreateForm(!showCreateForm); setError(null); }}
          style={{...styles.button, ...styles.createButton}}
        >
          {showCreateForm ? 'Cancel Create' : '+ Create New Playbook'}
        </button>
      </div>
      {error && <p style={{color: 'red', border: '1px solid red', padding: '10px', borderRadius: '4px'}}>{error}</p>}

      {showCreateForm && (
        <div style={styles.formContainer}>
          <PlaybookForm
            onSubmit={handleCreateSubmit}
            submitButtonText="Create Playbook"
            onCancel={() => { setShowCreateForm(false); setError(null); }}
          />
        </div>
      )}

      {!isLoading && playbooks.length === 0 && !showCreateForm && <p>No playbooks found. Click "Create New Playbook" to add one.</p>}

      {playbooks.length > 0 && (
        <ul style={styles.list}>
          {playbooks.map(playbook => (
            <li key={playbook.id} style={styles.listItem}>
              <div style={styles.listItemContent}>
                <span style={styles.listItemName}>{playbook.name}</span>
                <p style={styles.descriptionText}>
                  {playbook.description || 'No description.'}
                </p>
              </div>
              <div style={styles.actions}>
                <Link to={`/playbooks/edit/${playbook.id}`} style={{...styles.button, ...styles.editButton}}>Edit/View</Link>
                <button onClick={() => handleDelete(playbook.id)} style={{...styles.button, ...styles.deleteButton}}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PlaybooksPage;
