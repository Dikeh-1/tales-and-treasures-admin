// src/pages/VolunteerRolesPage.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  MenuItem,
  Select,
  useMediaQuery,
  useTheme,
  Tooltip,
} from '@mui/material';
import { type SelectChangeEvent } from '@mui/material/Select';
import { DataGrid, type GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VolunteerRoleFormModal from '../components/VolunteerRoleFormModal';
import ConfirmationModal from '../components/ConfirmationModal';

/** Breakpoint widths (match typical MUI defaults) */
const BP_XS = 600; // phones <600
const BP_SM = 900; // tablets 600-900, md >=900

type VolunteerRole = {
  id: number;
  title: string;
  description: string;
  imageUrl?: string;
};

export default function VolunteerRolesPage() {
  const [rows, setRows] = useState<VolunteerRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<VolunteerRole | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // local breakpoint state derived from actual container width (more robust)
  const [bp, setBp] = useState<'xs' | 'sm' | 'md'>('md');

  // keep useMediaQuery as helpful fallback / initial
  const theme = useTheme();
  const mqXs = useMediaQuery(theme.breakpoints.down('sm'));
  const mqSm = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // Sorting controls
  const [sortField, setSortField] = useState<'id' | 'title' | 'description'>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  /** Fetch */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/volunteer-roles');
      setRows((res.data || []) as VolunteerRole[]);
    } catch (error: unknown) {
      console.error('Error fetching volunteer roles:', error);
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
          ? ((error as { response?: { data?: { message?: string } } }).response?.data?.message as string)
          : 'Failed to fetch roles.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /** Save */
  const handleSave = async (data: { title: string; description: string; imageFile?: File }) => {
    try {
      let payload: FormData | { title: string; description: string };
      const headers: Record<string, string> = {};
      if (data.imageFile) {
        payload = new FormData();
        payload.append('title', data.title);
        payload.append('description', data.description);
        payload.append('image', data.imageFile);
        headers['Content-Type'] = 'multipart/form-data';
      } else {
        payload = { title: data.title, description: data.description };
      }

      if (itemToEdit) {
        await apiClient.patch(`/volunteer-roles/${itemToEdit.id}`, payload, { headers });
        toast.success('Role updated successfully!');
      } else {
        await apiClient.post('/volunteer-roles', payload, { headers });
        toast.success('Role added successfully!');
      }

      fetchData();
      handleCloseFormModal();
    } catch (error: unknown) {
      console.error('Error saving role:', error);
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
          ? ((error as { response?: { data?: { message?: string } } }).response?.data?.message as string)
          : 'Failed to save role.';
      toast.error(message);
    }
  };

  /** Delete */
  const confirmDelete = async () => {
    if (rowToDelete !== null) {
      try {
        await apiClient.delete(`/volunteer-roles/${rowToDelete}`);
        toast.success('Role deleted successfully!');
        fetchData();
      } catch (error: unknown) {
        console.error('Error deleting role:', error);
        const message =
          typeof error === 'object' &&
          error !== null &&
          'response' in error &&
          typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
            ? ((error as { response?: { data?: { message?: string } } }).response?.data?.message as string)
            : 'Failed to delete role.';
        toast.error(message);
      } finally {
        setDeleteModalOpen(false);
        setRowToDelete(null);
      }
    }
  };

  /** Handlers */
  const handleOpenFormModal = () => { setItemToEdit(null); setFormModalOpen(true); };
  const handleCloseFormModal = () => { setItemToEdit(null); setFormModalOpen(false); };
  const handleEditClick = (id: number) => () => {
    const item = rows.find((r) => r.id === id);
    if (!item) return;
    setItemToEdit(item);
    setFormModalOpen(true);
  };
  const handleDeleteClick = (id: number) => () => { setRowToDelete(id); setDeleteModalOpen(true); };

  /** Sorting helpers (client-side) */
  const handleSortFieldChange = (e: SelectChangeEvent<'id' | 'title' | 'description'>) => {
    setSortField(e.target.value as 'id' | 'title' | 'description');
  };
  const handleSortOrderToggle = () => { setSortOrder((s) => (s === 'asc' ? 'desc' : 'asc')); };

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const aVal = a[sortField] ?? '';
      const bVal = b[sortField] ?? '';
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortOrder === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    return copy;
  }, [rows, sortField, sortOrder]);

  /** Responsive logic: compute UI options based on breakpoint */
  const uiOptions = useMemo(() => {
    if (bp === 'xs') {
      return {
        showGrid: false,
        pageSize: 5,
        rowHeight: 72,
        density: 'compact' as const,
        columnVisibilityModel: { imageUrl: false, description: false, actions: true, title: true },
        gridHeight: 'auto',
      };
    }
    if (bp === 'sm') {
      return {
        showGrid: true,
        pageSize: 7,
        rowHeight: 68,
        density: 'compact' as const,
        columnVisibilityModel: { imageUrl: true, description: false, actions: true, title: true },
        gridHeight: '56vh',
      };
    }
    // md+
    return {
      showGrid: true,
      pageSize: 10,
      rowHeight: 80,
      density: 'standard' as const,
      columnVisibilityModel: { imageUrl: true, description: true, actions: true, title: true },
      gridHeight: '70vh',
    };
  }, [bp]);

  /** DataGrid columns */
  const columns: GridColDef<VolunteerRole>[] = [
    {
      field: 'imageUrl',
      headerName: 'Image',
      minWidth: 80,
      flex: 0,
      sortable: false,
      renderCell: (params) => (
        <img
          src={(params.value as string) || '/placeholder.png'}
          alt={params.row.title}
          style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6 }}
        />
      ),
    },
    { field: 'title', headerName: 'Title', minWidth: 140, flex: 1 },
    { field: 'description', headerName: 'Description', minWidth: 180, flex: 2, sortable: false },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      minWidth: 110,
      flex: 0,
      sortable: false,
      getActions: ({ id }) => [
        <GridActionsCellItem icon={<EditIcon />} label="Edit" onClick={handleEditClick(id as number)} />,
        <GridActionsCellItem icon={<DeleteIcon />} label="Delete" onClick={handleDeleteClick(id as number)} color="error" />,
      ],
    },
  ];

  /** List card for xs */
  const ListCard = ({ item }: { item: VolunteerRole }) => {
    const shortDesc = item.description ? (item.description.length > 120 ? item.description.slice(0, 117) + '...' : item.description) : '';
    return (
      <Paper elevation={1} sx={{ p: 1, display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1 }}>
        <Box sx={{ width: 72, height: 72, flexShrink: 0 }}>
          <img src={item.imageUrl || '/placeholder.png'} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{item.title}</Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>{shortDesc}</Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={handleEditClick(item.id)} aria-label={`Edit ${item.title}`}><EditIcon fontSize="small" /></IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" onClick={handleDeleteClick(item.id)} aria-label={`Delete ${item.title}`}><DeleteIcon fontSize="small" /></IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>
    );
  };

  /** ResizeObserver + debounce: detect width changes of containerRef and update bp */
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const applyBreakpoint = (width: number) => {
      if (width < BP_XS) setBp('xs');
      else if (width < BP_SM) setBp('sm');
      else setBp('md');
    };

    // prefer ResizeObserver when available (observes container element size)
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      const ro = new ResizeObserver((entries) => {
        const entry = entries[0];
        const width = entry.contentRect.width;
        // debounce small adjustments
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => applyBreakpoint(width), 80);
      });
      ro.observe(containerRef.current);
      return () => {
        ro.disconnect();
        clearTimeout(debounceTimer);
      };
    }

    // fallback to window resize
    const onResize = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const width = containerRef.current?.clientWidth ?? window.innerWidth;
        applyBreakpoint(width);
      }, 80);
    };
    window.addEventListener('resize', onResize);
    // initial set (use media queries as initial hint if no container)
    const initialWidth = containerRef.current?.clientWidth ?? window.innerWidth;
    applyBreakpoint(initialWidth);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(debounceTimer); };
  }, []);

  // ensure initial BP aligns with useMediaQuery on first render
  useEffect(() => {
    if (mqXs) setBp('xs');
    else if (mqSm) setBp('sm');
    else setBp('md');
    // only run on mount and when media queries change
  }, [mqXs, mqSm]);

  return (
    <Paper ref={containerRef} sx={{ p: { xs: 1, sm: 2 }, width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">Manage Volunteer Roles</Typography>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', width: { xs: '100%', sm: 'auto' } }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexGrow: bp === 'xs' ? 1 : 0 }}>
            <Select value={sortField} size={bp === 'xs' ? 'small' : 'medium'} onChange={handleSortFieldChange} sx={{ minWidth: 120 }}>
              <MenuItem value="id">ID</MenuItem>
              <MenuItem value="title">Title</MenuItem>
              <MenuItem value="description">Description</MenuItem>
            </Select>
            <Button size={bp === 'xs' ? 'small' : 'medium'} onClick={handleSortOrderToggle}>{sortOrder === 'asc' ? 'Asc' : 'Desc'}</Button>
          </Box>

          <Box sx={{ ml: 'auto', display: 'flex', gap: 1, mt: { xs: 1.5, sm: 0 }, justifyContent: { xs: 'flex-end', sm: 'flex-start' } }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenFormModal} size={bp === 'xs' ? 'small' : 'medium'}>
              Add Role
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Content: List for xs; DataGrid for sm/md */}
      {uiOptions.showGrid ? (
        <Box sx={{ width: '100%', height: uiOptions.gridHeight, '& .MuiDataGrid-root': { border: 'none' } }}>
          <DataGrid
            rows={sortedRows}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.id}
            pageSize={uiOptions.pageSize}
            rowsPerPageOptions={[5, 7, 10, 20]}
            checkboxSelection={false}
            disableSelectionOnClick
            columnVisibilityModel={uiOptions.columnVisibilityModel}
            rowHeight={uiOptions.rowHeight}
            density={uiOptions.density}
            autoHeight={bp === 'sm'} // allow tablet grid to shrink
            sx={{
              width: '100%',
              boxShadow: 0,
              border: 'none',
              '& .MuiDataGrid-cell': { alignItems: 'center' },
              '& .MuiDataGrid-virtualScroller': { overflowX: 'auto' },
            }}
            disableColumnMenu={false}
            sortingMode="client"
          />
        </Box>
      ) : (
        <Box sx={{ width: '100%' }}>
          {sortedRows.length === 0 && !loading ? (
            <Typography variant="body2">No roles found.</Typography>
          ) : (
            <Box>
              {(sortedRows as VolunteerRole[]).map((r) => <ListCard key={r.id} item={r} />)}
            </Box>
          )}
        </Box>
      )}

      <VolunteerRoleFormModal open={formModalOpen} onClose={handleCloseFormModal} onSave={handleSave} initialData={itemToEdit} />
      <ConfirmationModal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} onConfirm={confirmDelete} title="Confirm Deletion" message="Are you sure you want to delete this role?" />
    </Paper>
  );
}
