import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getHosts, createHost, deleteHost, Host, HostFormData, getHostGroups, HostGroup } from '../services/hostService';
import HostForm from '../components/hosts/HostForm'; // Import HostForm

const styles: { [key: string]: React.CSSProperties } = {
  page: { padding: '20px', maxWidth: '1000px', margin: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  list: { listStyle: 'none', padding: 0, marginTop: '20px' },
  listItem: { padding: '15px', border: '1px solid #ddd', borderRadius: '5px', marginBottom: '15px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  listItemHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  hostName: { fontWeight: 'bold', fontSize: '1.3em', color: '#333' },
  actions: { display: 'flex', gap: '10px' },
  button: { padding: '6px 12px', textDecoration: 'none', border: '1px solid transparent', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em' },
  editButton: { backgroundColor: '#ffc107', color: 'black' },
  deleteButton: { backgroundColor: '#dc3545', color: 'white' },
  createButton: { backgroundColor: '#28a745', color: 'white' },
  formContainer: { marginTop: '20px', marginBottom: '30px', padding: '25px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' },
  details: { fontSize: '0.9em', color: '#444' },
  detailsLine: { margin: '5px 0', display: 'block' },
  detailsLabel: { fontWeight: '600', marginRight: '5px' },
  filterContainer: { marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' },
  variablesPre: {fontSize:'0.85em', maxHeight:'70px', overflowY:'auto', backgroundColor:'#f0f0f0', padding:'8px', borderRadius: '4px', border: '1px solid #e0e0e0', whiteSpace: 'pre-wrap', wordBreak: 'break-all'}
};

const HostsPage: React.FC = () => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [allHostGroups, setAllHostGroups] = useState<HostGroup[]>([]);
  const [selectedGroupIdFilter, setSelectedGroupIdFilter] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchHostsAndGroups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const groupId = selectedGroupIdFilter ? parseInt(selectedGroupIdFilter, 10) : undefined;
      const hostsData = await getHosts(groupId);
      // Enhance hostsData with group_details for display if groups are just IDs
      const enhancedHosts = hostsData.map(host => {
          const groupDetails = host.groups.map(gid => allHostGroups.find(hg => hg.id === gid)).filter(g => g) as HostGroup[];
          return {...host, group_details: groupDetails};
      });
      setHosts(enhancedHosts);

      if (allHostGroups.length === 0) {
          const groupsData = await getHostGroups();
          setAllHostGroups(groupsData);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedGroupIdFilter, allHostGroups]); // allHostGroups added as dependency

  useEffect(() => {
    // Initial fetch for groups, then hosts
    const initialLoad = async () => {
        setIsLoading(true);
        try {
            const groupsData = await getHostGroups();
            setAllHostGroups(groupsData);
            // Now fetch hosts (which might use these groups for display enhancement)
            const groupId = selectedGroupIdFilter ? parseInt(selectedGroupIdFilter, 10) : undefined;
            const hostsData = await getHosts(groupId);
            const enhancedHosts = hostsData.map(host => {
                const groupDetails = host.groups.map(gid => groupsData.find(hg => hg.id === gid)).filter(g => g) as HostGroup[];
                return {...host, group_details: groupDetails};
            });
            setHosts(enhancedHosts);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch initial data.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    initialLoad();
  }, [selectedGroupIdFilter]); // Re-fetch if filter changes

  const handleCreateSubmit = async (data: HostFormData) => {
    try {
      await createHost(data);
      fetchHostsAndGroups();
      setShowCreateForm(false);
    } catch (err: any) {
      console.error("Create host failed:", err);
      throw err;
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this host? This action cannot be undone.')) {
      try {
        await deleteHost(id);
        fetchHostsAndGroups();
      } catch (err: any) {
        setError(err.message || 'Failed to delete host.');
        console.error(err);
      }
    }
  };

  if (isLoading && hosts.length === 0 && allHostGroups.length === 0) return <div style={styles.page}>Loading hosts and groups...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2>Hosts</h2>
        <button
          onClick={() => { setShowCreateForm(!showCreateForm); setError(null); }}
          style={{...styles.button, ...styles.createButton}}
        >
          {showCreateForm ? 'Cancel Create' : '+ Add New Host'}
        </button>
      </div>

      {error && <p style={{color: 'red', border: '1px solid red', padding: '10px', borderRadius: '4px'}}>{error}</p>}

      {showCreateForm && (
        <div style={styles.formContainer}>
          <HostForm
            onSubmit={handleCreateSubmit}
            submitButtonText="Create Host"
            onCancel={() => { setShowCreateForm(false); setError(null); }}
          />
        </div>
      )}

      <div style={styles.filterContainer}>
        <label htmlFor="group_filter" style={{marginRight: '10px', fontWeight: '500'}}>Filter by Group:</label>
        <select
            id="group_filter"
            value={selectedGroupIdFilter}
            onChange={(e) => setSelectedGroupIdFilter(e.target.value)}
            style={{padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}}
        >
            <option value="">All Groups</option>
            {allHostGroups.map(group => (
                <option key={group.id} value={group.id}>{group.name}</option>
            ))}
        </select>
      </div>

      {isLoading && <p>Loading hosts...</p>}
      {!isLoading && hosts.length === 0 && !showCreateForm && <p>No hosts found. Try adjusting filters or create a new host.</p>}

      <ul style={styles.list}>
        {hosts.map(host => (
          <li key={host.id} style={styles.listItem}>
            <div style={styles.listItemHeader}>
              <span style={styles.hostName}>{host.name}</span>
              <div style={styles.actions}>
                <Link to={`/hosts/edit/${host.id}`} style={{...styles.button, ...styles.editButton}}>Edit</Link>
                <button onClick={() => handleDelete(host.id)} style={{...styles.button, ...styles.deleteButton}}>Delete</button>
              </div>
            </div>
            <div style={styles.details}>
              <span style={styles.detailsLine}><strong style={styles.detailsLabel}>IP:</strong> {host.ip_address || 'N/A'}</span>
              <span style={styles.detailsLine}><strong style={styles.detailsLabel}>FQDN:</strong> {host.fqdn || 'N/A'}</span>
              <span style={styles.detailsLine}><strong style={styles.detailsLabel}>User:</strong> {host.ansible_user || 'default'}</span>
              <span style={styles.detailsLine}><strong style={styles.detailsLabel}>Port:</strong> {host.ansible_port || 22}</span>
              {host.ssh_key_name && <span style={styles.detailsLine}><strong style={styles.detailsLabel}>SSH Key:</strong> {host.ssh_key_name}</span>}
              {host.group_details && host.group_details.length > 0 &&
                <span style={styles.detailsLine}><strong style={styles.detailsLabel}>Groups:</strong> {host.group_details.map(g => g.name).join(', ')}</span>
              }
               {host.variables && Object.keys(host.variables).length > 0 &&
                <div><strong style={styles.detailsLabel}>Variables:</strong> <pre style={styles.variablesPre}>{JSON.stringify(host.variables, null, 2)}</pre></div>
              }
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
export default HostsPage;
