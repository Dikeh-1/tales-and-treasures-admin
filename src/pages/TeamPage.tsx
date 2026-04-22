// src/pages/TeamPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Typography, Box, Paper, Button, Chip, Switch, FormControlLabel, Avatar,
  useTheme, useMediaQuery, IconButton, Menu, MenuItem, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, AppBar, Toolbar,
  Drawer, List, ListItem, ListItemIcon, ListItemText, Divider,
  Card, CardContent, CardActions
} from '@mui/material';
import { DataGrid, type GridColDef, type GridRowsProp } from '@mui/x-data-grid';
import { toast } from 'react-hot-toast';
import apiClient from '../api/apiClient';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FilterListIcon from '@mui/icons-material/FilterList';
import MenuIcon from '@mui/icons-material/Menu';
import TeamMemberFormModal from '../components/TeamMemberFormModal';
import LoadingOverlay from '../components/LoadingOverlay';

type TeamRow = {
  id: number | string;
  name: string;
  role?: string;
  avatarUrl?: string | null;
  status?: 'Active' | 'Archived' | string;
  [key: string]: any;
};

export default function TeamPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [rows, setRows] = useState<GridRowsProp>([]);
  const [loading, setLoading] = useState(true);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<TeamRow | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedRow, setSelectedRow] = useState<TeamRow | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const fetchTeamMembers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/team');
      setRows(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch team members.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  const handleSaveMember = async (memberData: any) => {
    setLoading(true);
    const formData = new FormData();
    
    if (memberData.name) formData.append('name', memberData.name);
    if (memberData.role) formData.append('role', memberData.role);
    if (memberData.avatarFile) {
      formData.append('avatarFile', memberData.avatarFile);
    }

    try {
      if (memberToEdit && memberToEdit.id) {
        await apiClient.patch(`/team/${memberToEdit.id}`, formData);
        toast.success('Team member updated!');
      } else {
        await apiClient.post('/team', formData);
        toast.success('Team member added!');
      }
      setFormModalOpen(false);
      await fetchTeamMembers();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save team member.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: number, status: 'Archived' | 'Active') => {
    setLoading(true);
    try {
      await apiClient.patch(`/team/${id}`, { status });
      toast.success(`Team member ${status.toLowerCase()}.`);
      await fetchTeamMembers();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update member status.');
    } finally {
      setLoading(false);
      setActionMenuAnchor(null);
    }
  };

  const confirmDeletePermanent = async () => {
    if (rowToDelete !== null) {
      setLoading(true);
      try {
        await apiClient.delete(`/team/${rowToDelete}`);
        toast.success('Team member permanently deleted!');
        await fetchTeamMembers();
      } catch (error) {
        console.error(error);
        toast.error('Failed to delete team member.');
      } finally {
        setDeleteModalOpen(false);
        setRowToDelete(null);
        setLoading(false);
        setActionMenuAnchor(null);
      }
    }
  };

  const handleEditClick = (id: number) => () => {
    const member = (rows as TeamRow[]).find((row) => row.id === id);
    setMemberToEdit(member ?? null);
    setFormModalOpen(true);
    setActionMenuAnchor(null);
  };

  const handleDeletePermanentClick = (id: number) => () => {
    setRowToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleActionMenuOpen = (event: React.MouseEvent<HTMLElement>, row: TeamRow) => {
    setSelectedRow(row);
    setActionMenuAnchor(event.currentTarget);
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
    setSelectedRow(null);
  };

  const columns = useMemo<GridColDef[]>(
    () => [
      { 
        field: 'id', 
        headerName: 'ID', 
        width: 70,
        hide: isMobile,
      },
      {
        field: 'avatarUrl',
        headerName: 'Avatar',
        width: 60,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const url = params.value as string | undefined | null;
          const firstChar = params.row?.name ? String(params.row.name)[0] : '';
          return <Avatar src={url ?? undefined} sx={{ width: 32, height: 32 }}>{!url ? firstChar : null}</Avatar>;
        },
      },
      { 
        field: 'name', 
        headerName: 'Name', 
        flex: 1,
        minWidth: 120,
      },
      { 
        field: 'role', 
        headerName: 'Role', 
        flex: 1,
        minWidth: 120,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 100,
        minWidth: 90,
        renderCell: (params) => (
          <Chip
            label={params.value ?? '—'}
            color={params.value === 'Active' ? 'success' : 'warning'}
            size="small"
          />
        ),
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: 'Actions',
        width: 80,
        getActions: ({ id, row }) => {
          return [
            <IconButton
              key="more"
              size="small"
              onClick={(e) => handleActionMenuOpen(e, row)}
              sx={{ padding: '4px' }}
            >
              <MoreVertIcon />
            </IconButton>,
          ];
        },
      },
    ],
    [isMobile]
  );

  const filteredRows = useMemo(
    () => (rows as TeamRow[]).filter((row) => (showArchived ? row.status === 'Archived' : row.status !== 'Archived')),
    [rows, showArchived]
  );

  // Render team members as cards on mobile
  const renderMobileCards = () => {
    if (filteredRows.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', p: 3 }}>
          <Typography variant="body1">
            {showArchived ? 'No archived team members found.' : 'No team members found. Add a team member to get started.'}
          </Typography>
        </Box>
      );
    }

    return filteredRows.map((row) => (
      <Card key={row.id} sx={{ mb: 2, boxShadow: 2 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar 
            src={row.avatarUrl || undefined} 
            sx={{ width: 48, height: 48 }}
          >
            {row.name ? String(row.name)[0] : ''}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="div">
              {row.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {row.role || 'No role specified'}
            </Typography>
            <Chip
              label={row.status || '—'}
              color={row.status === 'Active' ? 'success' : 'warning'}
              size="small"
              sx={{ mt: 1 }}
            />
          </Box>
          <IconButton
            onClick={(e) => handleActionMenuOpen(e, row)}
          >
            <MoreVertIcon />
          </IconButton>
        </CardContent>
      </Card>
    ));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Mobile App Bar */}
      {isMobile && (
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="open drawer"
              onClick={() => setMobileDrawerOpen(true)}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, ml: 2 }}>
              Team Management
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Mobile Drawer */}
        {isMobile && (
          <Drawer
            anchor="left"
            open={mobileDrawerOpen}
            onClose={() => setMobileDrawerOpen(false)}
          >
            <Box sx={{ width: 250, p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Team Options
              </Typography>
              <Divider />
              <List>
                <ListItem>
                  <FormControlLabel 
                    control={
                      <Switch 
                        checked={showArchived} 
                        onChange={(e) => {
                          setShowArchived(e.target.checked);
                          setMobileDrawerOpen(false);
                        }} 
                      />
                    } 
                    label="Show Archived" 
                  />
                </ListItem>
              </List>
            </Box>
          </Drawer>
        )}

        <Paper sx={{ 
          p: { xs: 1, sm: 2 }, 
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: isMobile ? 0 : 1
        }}>
          {loading && <LoadingOverlay message="Processing..." />}

          {/* Header for desktop/tablet */}
          {!isMobile && (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              mb: 2,
              flexShrink: 0
            }}>
              <Typography variant="h5">
                Manage Team
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormControlLabel 
                  control={
                    <Switch 
                      checked={showArchived} 
                      onChange={(e) => setShowArchived(e.target.checked)} 
                    />
                  } 
                  label="Show Archived" 
                />
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setMemberToEdit(null);
                    setFormModalOpen(true);
                  }}
                >
                  Add Team Member
                </Button>
              </Box>
            </Box>
          )}

          {/* Content Area */}
          <Box sx={{ 
            flexGrow: 1, 
            minHeight: 0, 
            overflow: 'auto',
            width: '100%'
          }}>
            {isMobile ? (
              <Box sx={{ p: 1 }}>
                {renderMobileCards()}
              </Box>
            ) : (
              <DataGrid 
                rows={filteredRows} 
                columns={columns} 
                density={isTablet ? 'compact' : 'standard'}
                sx={{
                  '& .MuiDataGrid-cell': {
                    padding: { xs: '4px', sm: '8px' },
                    display: 'flex',
                    alignItems: 'center',
                  },
                  '& .MuiDataGrid-columnHeaders': {
                    padding: { xs: '4px', sm: '8px' },
                  },
                  '& .MuiDataGrid-virtualScroller': {
                    overflow: 'auto',
                  },
                }}
                autoPageSize
              />
            )}
          </Box>

          {/* Floating action button for mobile */}
          {isMobile && (
            <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  setMemberToEdit(null);
                  setFormModalOpen(true);
                }}
                sx={{
                  borderRadius: '50%',
                  width: 56,
                  height: 56,
                  minWidth: 0,
                  boxShadow: 3
                }}
              >
                <AddIcon />
              </Button>
            </Box>
          )}

          {/* Action Menu for rows */}
          <Menu
            anchorEl={actionMenuAnchor}
            open={Boolean(actionMenuAnchor)}
            onClose={handleActionMenuClose}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            {selectedRow?.status === 'Archived' ? (
              [
                <MenuItem key="restore" onClick={() => selectedRow.id && handleStatusUpdate(selectedRow.id as number, 'Active')}>
                  <RestoreFromTrashIcon sx={{ mr: 1, color: 'success.main' }} /> Restore
                </MenuItem>,
                <MenuItem key="delete" onClick={() => selectedRow.id && handleDeletePermanentClick(selectedRow.id as number)()}>
                  <DeleteIcon sx={{ mr: 1, color: 'error.main' }} /> Delete Permanently
                </MenuItem>
              ]
            ) : (
              [
                <MenuItem key="edit" onClick={() => selectedRow.id && handleEditClick(selectedRow.id as number)()}>
                  <EditIcon sx={{ mr: 1 }} /> Edit
                </MenuItem>,
                <MenuItem key="archive" onClick={() => selectedRow.id && handleStatusUpdate(selectedRow.id as number, 'Archived')}>
                  <DeleteIcon sx={{ mr: 1 }} /> Archive
                </MenuItem>
              ]
            )}
          </Menu>

          <TeamMemberFormModal
            open={formModalOpen}
            onClose={() => setFormModalOpen(false)}
            onSave={handleSaveMember}
            initialData={memberToEdit}
            loading={loading}
          />

          {/* Confirmation Dialog */}
          <Dialog
            open={deleteModalOpen}
            onClose={() => setDeleteModalOpen(false)}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
            fullScreen={isMobile}
          >
            <DialogTitle id="alert-dialog-title">
              Confirm Permanent Deletion
            </DialogTitle>
            <DialogContent>
              <DialogContentText id="alert-dialog-description">
                Are you sure you want to permanently delete this team member? This action cannot be undone.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
              <Button onClick={confirmDeletePermanent} color="error" autoFocus>
                Delete
              </Button>
            </DialogActions>
          </Dialog>
        </Paper>
      </Box>
    </Box>
  );
}