import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useMediaQuery,
  useTheme,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  Grid,
  Card,
  CardContent,
  Button,
  Avatar,
  MenuList,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  DataGrid,
  type GridColDef,
  type GridRowsProp,
  GridActionsCellItem,
  GridToolbar
} from '@mui/x-data-grid';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import PersonIcon from '@mui/icons-material/Person';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import UnsubscribeIcon from '@mui/icons-material/Unsubscribe'; // 👈 New Icon
import UserFormModal from '../components/UserFormModal';
import ConfirmationModal from '../components/ConfirmationModal';
import LoadingOverlay from '../components/LoadingOverlay';

export default function UsersPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [rows, setRows] = useState<GridRowsProp>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'admins' | 'subscribers'>('all');
  
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<any>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);

  // Menus
  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);
  const [actionAnchor, setActionAnchor] = useState<Record<number, HTMLElement | null>>({});

  // ✅ Dynamic Title
  const getPageTitle = () => {
    if (filter === 'admins') return 'Manage Admins';
    if (filter === 'subscribers') return 'Manage Newsletter Subscribers';
    return 'All Accounts';
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/users', { params: { filter } });
      setRows(response.data || []);
    } catch (error: any) {
      console.error('Fetch error', error);
      toast.error('Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSave = async (data: any) => {
    if (!userToEdit) return;
    setLoading(true);
    try {
      await apiClient.patch(`/users/${userToEdit.id}`, data);
      toast.success('Updated successfully!');
      setFormModalOpen(false);
      await fetchData();
    } catch (error) {
      console.error('Save error', error);
      toast.error('Failed to save.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Unsubscribe Logic
  const handleUnsubscribe = async (id: number) => {
    if (!window.confirm('Are you sure you want to unsubscribe this user from the newsletter?')) return;
    
    setLoading(true);
    try {
      // We use the existing User Update endpoint to set isSubscribed to false
      await apiClient.patch(`/users/${id}`, { isSubscribed: false });
      toast.success('User unsubscribed successfully.');
      await fetchData();
    } catch (error) {
      console.error('Unsubscribe error', error);
      toast.error('Failed to unsubscribe user.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (rowToDelete === null) return;
    setLoading(true);
    try {
      await apiClient.delete(`/users/${rowToDelete}`);
      toast.success('Deleted successfully!');
      await fetchData();
    } catch (error) {
      console.error('Delete error', error);
      toast.error('Failed to delete. Try refreshing.');
    } finally {
      setDeleteModalOpen(false);
      setRowToDelete(null);
      setLoading(false);
    }
  };

  const handleEditClick = (id: number) => () => {
    const user = rows.find((r) => r.id === id);
    setUserToEdit(user || null);
    setFormModalOpen(true);
  };

  const handleDeleteClick = (id: number) => () => {
    setRowToDelete(id);
    setDeleteModalOpen(true);
  };

  const openFilterMenu = (e: React.MouseEvent<HTMLElement>) => setFilterAnchor(e.currentTarget);
  const closeFilterMenu = () => setFilterAnchor(null);
  const onSelectFilter = (value: any) => {
    setFilter(value);
    closeFilterMenu();
  };

  const openActionMenu = (id: number) => (e: React.MouseEvent<HTMLElement>) => {
    setActionAnchor((prev) => ({ ...prev, [id]: e.currentTarget }));
  };
  const closeActionMenu = (id: number) => () => setActionAnchor((prev) => ({ ...prev, [id]: null }));

  // ✅ Desktop Columns
  const columns: GridColDef[] = useMemo(() => [
    { 
      field: 'name', 
      headerName: 'Name', 
      flex: 1, 
      minWidth: 150 
    },
    { 
      field: 'email', 
      headerName: 'Email', 
      flex: 1.5, 
      minWidth: 200 
    },
    {
      field: 'isSubscribed',
      headerName: 'Newsletter',
      width: 160,
      renderCell: (params) => (
        <Chip 
          label={params.value ? 'Subscribed' : 'No'} 
          color={params.value ? 'success' : 'default'} 
          size="small" 
          variant="outlined"
        />
      ),
    },
    {
      field: 'role',
      headerName: 'Role',
      width: 130,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={params.value === 'Admin' ? 'primary' : 'default'} 
          size="small" 
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={params.value === 'Active' ? 'success' : 'error'} 
          size="small" 
        />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 150, // Increased width for new button
      getActions: (params) => {
        const actions = [
          <GridActionsCellItem 
            icon={<EditIcon />} 
            label="Edit" 
            onClick={handleEditClick(params.id as number)} 
          />,
          <GridActionsCellItem 
            icon={<DeleteIcon sx={{ color: 'error.main' }} />} 
            label="Delete" 
            onClick={handleDeleteClick(params.id as number)} 
          />,
        ];

        // ✅ Add Unsubscribe button if user is subscribed
        if (params.row.isSubscribed) {
          actions.unshift(
            <GridActionsCellItem
              icon={<UnsubscribeIcon sx={{ color: 'warning.main' }} />}
              label="Unsubscribe"
              onClick={() => handleUnsubscribe(params.id as number)}
              color="inherit"
              showInMenu={false}
            />
          );
        }

        return actions;
      },
    },
  ], []);

  // ✅ Mobile Card View
  const renderCards = () => (
    <Grid container spacing={2} sx={{ pb: 2 }}>
      {rows.length === 0 && (
        <Typography sx={{ p: 3, width: '100%', textAlign: 'center', color: 'text.secondary' }}>
          No accounts found.
        </Typography>
      )}
      {rows.map((row) => (
        <Grid item xs={12} sm={6} md={4} key={row.id}>
          <Card variant="outlined" sx={{ height: '100%', position: 'relative' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', gap: 2, overflow: 'hidden' }}>
                  <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                    {row.name ? row.name[0].toUpperCase() : <PersonIcon />}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight="bold" noWrap>
                      {row.name || 'No Name'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                      {row.email}
                    </Typography>
                  </Box>
                </Box>
                <IconButton size="small" onClick={openActionMenu(row.id)}>
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Box>

              <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip size="small" label={row.role} color={row.role === 'Admin' ? 'primary' : 'default'} />
                <Chip size="small" label={row.status} color={row.status === 'Active' ? 'success' : 'error'} />
                {row.isSubscribed && <Chip size="small" label="Newsletter" color="success" variant="outlined" />}
              </Box>
            </CardContent>

            {/* Mobile Action Menu */}
            <Menu
              anchorEl={actionAnchor[row.id]}
              open={Boolean(actionAnchor[row.id])}
              onClose={closeActionMenu(row.id)}
            >
              <MenuList dense>
                <MenuItem onClick={() => { closeActionMenu(row.id)(); handleEditClick(row.id)(); }}>
                  <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Edit Account</ListItemText>
                </MenuItem>
                {/* ✅ Unsubscribe in Mobile Menu */}
                {row.isSubscribed && (
                  <MenuItem onClick={() => { closeActionMenu(row.id)(); handleUnsubscribe(row.id); }}>
                    <ListItemIcon><UnsubscribeIcon fontSize="small" sx={{ color: 'warning.main' }} /></ListItemIcon>
                    <ListItemText>Unsubscribe</ListItemText>
                  </MenuItem>
                )}
                <MenuItem onClick={() => { closeActionMenu(row.id)(); handleDeleteClick(row.id)(); }}>
                  <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                  <ListItemText sx={{ color: 'error.main' }}>Delete Account</ListItemText>
                </MenuItem>
              </MenuList>
            </Menu>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Box sx={{ 
      minHeight: '100%',
      display: 'flex', 
      flexDirection: 'column', 
      p: { xs: 1, md: 3 },
      maxWidth: '100%',
      overflow: 'visible'
    }}>
      {loading && <LoadingOverlay message="Processing..." />}

      {/* Responsive Header */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          mb: 2, 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight="700" gutterBottom={isMobile}>
            {getPageTitle()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {rows.length} account{rows.length !== 1 && 's'} found
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, width: { xs: '100%', md: 'auto' } }}>
          <FormControl size="small" sx={{ minWidth: 200, width: { xs: '100%', md: 'auto' } }}>
            <InputLabel>Filter View</InputLabel>
            <Select 
              value={filter} 
              label="Filter View" 
              onChange={(e) => setFilter(e.target.value as any)}
            >
              <MenuItem value="all">All Accounts</MenuItem>
              <MenuItem value="admins">Admins Only</MenuItem>
              <MenuItem value="subscribers">Newsletter Subscribers</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Main Content Area */}
      <Paper 
        elevation={0}
        sx={{ 
          flexGrow: 1, 
          border: `1px solid ${theme.palette.divider}`,
          overflow: 'visible',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {isTablet ? (
          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
            {renderCards()}
          </Box>
        ) : (
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            slots={{ toolbar: GridToolbar }}
            slotProps={{ 
              toolbar: { 
                showQuickFilter: true, 
                quickFilterProps: { debounceMs: 500 }
              } 
            }}
            disableRowSelectionOnClick
            sx={{ border: 0 }}
          />
        )}
      </Paper>

      {/* Modals */}
      <UserFormModal 
        open={formModalOpen} 
        onClose={() => setFormModalOpen(false)} 
        onSave={handleSave} 
        initialData={userToEdit} 
        loading={loading} 
      />
      
      <ConfirmationModal 
        open={deleteModalOpen} 
        onClose={() => setDeleteModalOpen(false)} 
        onConfirm={confirmDelete} 
        title="Confirm Deletion" 
        message="Are you sure? This will permanently delete this account and all associated data (credentials, devices, etc)." 
        confirmColor="error" 
        confirmText="Delete Permanently" 
      />
    </Box>
  );
}
