import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom'; // Removed useNavigate as edit navigates via Link
import { getHostGroups, createHostGroup, deleteHostGroup, HostGroup, HostGroupFormData } from '../services/hostService';
import HostGroupForm from '../components/hosts/HostGroupForm';

const styles: { [key: string]: React.CSSProperties } = {
  page: { padding: '20px', maxWidth: '900px', margin: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  list: { listStyle: 'none', padding: 0, marginTop: '20px' },
  listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '10px', backgroundColor: '#fff' },
  listItemName: { fontWeight: 'bold', fontSize: '1.1em' },
  actions: { display: 'flex', gap: '10px' },
  button: { padding: '6px 12px', textDecoration: 'none', border: '1px solid transparent', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em' },
  editButton: { backgroundColor: '#ffc107', color: 'black' },
  deleteButton: { backgroundColor: '#dc3545', color: 'white' },
  createButton: { backgroundColor: '#28a745', color: 'white' },
  formContainer: { marginTop: '20px', marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }
};

const HostGroupsPage: React.FC = () => {
  const [hostGroups, setHostGroups] = useState<HostGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchGroups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getHostGroups();
      setHostGroups(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch host groups.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleCreateSubmit = async (data: HostGroupFormData) => {
    try {
      await createHostGroup(data);
      fetchGroups();
      setShowCreateForm(false);
    } catch (err: any) {
      console.error("Create host group failed:", err);
      throw err;
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this host group? This might affect hosts in this group.')) {
      try {
        await deleteHostGroup(id);
        fetchGroups();
      } catch (err: any) {
        setError(err.message || 'Failed to delete host group.');
        console.error(err);
      }
    }
  };

  if (isLoading && hostGroups.length === 0) return <div style={styles.page}>Loading host groups...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2>Host Groups</h2>
        <button
          onClick={() => { setShowCreateForm(!showCreateForm); setError(null); }}
          style={{...styles.button, ...styles.createButton}}
        >
          {showCreateForm ? 'Cancel' : '+ Create New Group'}
        </button>
      </div>

      {error && <p style={{color: 'red', border: '1px solid red', padding: '10px', borderRadius: '4px'}}>{error}</p>}

      {showCreateForm && (
        <div style={styles.formContainer}>
          <HostGroupForm
            onSubmit={handleCreateSubmit}
            submitButtonText="Create Group"
            onCancel={() => { setShowCreateForm(false); setError(null); }}
          />
        </div>
      )}

      {hostGroups.length === 0 && !isLoading && !showCreateForm && <p>No host groups found. Click "Create New Group" to add one.</p>}

      {!isLoading && hostGroups.length > 0 && (
        <ul style={styles.list}>
          {hostGroups.map(group => (
            <li key={group.id} style={styles.listItem}>
              <div>
                <span style={styles.listItemName}>{group.name}</span>
                <p style={{fontSize: '0.9em', color: '#555', margin: '5px 0 0 0'}}>{group.description || 'No description'}</p>
                <small style={{color: '#777'}}>Created by: {group.created_by_username || 'N/A'} on {group.created_at ? new Date(group.created_at).toLocaleDateString() : 'N/A'}</small>
              </div>
              <div style={styles.actions}>
                <Link to={`/hostgroups/edit/${group.id}`} style={{...styles.button, ...styles.editButton}}>Edit</Link>
                <button onClick={() => handleDelete(group.id)} style={{...styles.button, ...styles.deleteButton}}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default HostGroupsPage;
