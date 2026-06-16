import { useState, useEffect, useCallback } from 'react';
import { Box, Paper, Typography, Button, useTheme, useMediaQuery } from '@mui/material';
import {
  DataGrid,
  type GridColDef,
  type GridRowsProp,
  GridActionsCellItem,
  GridToolbar
} from '@mui/x-data-grid';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StoryBridgeFormModal from '../components/StoryBridgeFormModal';
import ConfirmationModal from '../components/ConfirmationModal';

type StoryBridgeRow = {
  id: number;
  title: string;
  description: string;
  imageUrl?: string;
};

type StoryBridgeFormData = {
  title: string;
  description: string;
  imageFile?: File | null;
  imageUrl?: string;
};

export default function StoryBridgePage() {
  const [rows, setRows] = useState<GridRowsProp>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // 👈 Added Processing State
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<StoryBridgeRow | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // 👈 Check for mobile screens

  /** ✅ Fetch Story Bridges */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/story-bridges');
      // ⚠️ FIX: Use the data directly. Do NOT prepend API URL because Cloudinary returns full URLs.
      setRows(res.data);
    } catch (error) {
      console.error('Failed to fetch Story Bridges:', error);
      toast.error('Failed to fetch Story Bridges.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /** ✅ Save Story Bridge */
  const handleSave = async (data: StoryBridgeFormData) => {
    setIsSaving(true); // 👈 Start Processing
    try {
      const formData = new FormData();
      // Ensure we append values only if they exist to avoid sending "undefined" string
      formData.append('title', data.title || '');
      formData.append('description', data.description || '');
      
      if (data.imageFile) {
        formData.append('image', data.imageFile);
      }

      if (itemToEdit) {
        await apiClient.patch(`/story-bridges/${itemToEdit.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Story Bridge updated!');
      } else {
        await apiClient.post('/story-bridges', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Story Bridge added!');
      }

      fetchData();
      handleCloseFormModal();
    } catch (error) {
      console.error('Failed to save Story Bridge:', error);
      toast.error('Failed to save Story Bridge.');
    } finally {
      setIsSaving(false); // 👈 Stop Processing
    }
  };

  /** ✅ Delete Story Bridge */
  const confirmDelete = async () => {
    if (!rowToDelete) return;
    try {
      await apiClient.delete(`/story-bridges/${rowToDelete}`);
      toast.success('Story Bridge deleted!');
      fetchData();
    } catch (error) {
      console.error('Failed to delete Story Bridge:', error);
      toast.error('Failed to delete Story Bridge.');
    } finally {
      setDeleteModalOpen(false);
      setRowToDelete(null);
    }
  };

  /** ✅ Modal Controls */
  const handleOpenFormModal = () => setFormModalOpen(true);
  const handleCloseFormModal = () => {
    setItemToEdit(null);
    setFormModalOpen(false);
  };
  const handleEditClick = (id: number) => () => {
    const item = rows.find((row) => row.id === id) as StoryBridgeRow | undefined;
    setItemToEdit(item);
    handleOpenFormModal();
  };
  const handleDeleteClick = (id: number) => () => {
    setRowToDelete(id);
    setDeleteModalOpen(true);
  };

  /** ✅ DataGrid Columns */
  const columns: GridColDef[] = [
    {
      field: 'imageUrl',
      headerName: 'Image',
      width: 80,
      renderCell: (params) => (
        params.value ? (
          <Box
            component="img"
            sx={{
              height: 40,
              width: 40,
              objectFit: 'cover',
              borderRadius: 1,
              mt: 1
            }}
            src={params.value}
            alt="Img"
          />
        ) : null
      ),
    },
    { field: 'title', headerName: 'Title', width: 200 },
    { field: 'description', headerName: 'Description', flex: 1, minWidth: 200 },
      {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      getActions: ({ id }) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Edit"
          onClick={handleEditClick(id as number)}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon color="error" />}
          label="Delete"
          onClick={handleDeleteClick(id as number)}
        />,
      ],
    },
  ];

  return (
    // ✅ RESPONSIVENESS: Use flex column layout with height 100%
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: { xs: 1, md: 2 } }}>
      <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row', // Stack on mobile
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: 2,
            mb: 2,
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Manage Story Bridges</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenFormModal}
            fullWidth={isMobile}
          >
            Add Story Bridge
          </Button>
        </Box>

        {/* ✅ Data Table with responsive container */}
        <Box sx={{ flexGrow: 1, width: '100%' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            slots={{ toolbar: GridToolbar }} // Added toolbar for better UX
            slotProps={{ toolbar: { showQuickFilter: true } }}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 20 },
              },
            }}
            pageSizeOptions={[5, 10, 20, 50, 100]}
            disableRowSelectionOnClick
          />
        </Box>
      </Paper>

      {/* ✅ Form Modal with Processing State */}
      <StoryBridgeFormModal
        open={formModalOpen}
        onClose={handleCloseFormModal}
        onSave={handleSave}
        initialData={itemToEdit}
        isLoading={isSaving} // 👈 Pass loading state
      />

      <ConfirmationModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Confirm Deletion"
        message="Are you sure you want to delete this story bridge?"
      />
    </Box>
  );
}
