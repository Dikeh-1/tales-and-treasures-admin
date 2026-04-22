import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  useTheme,
  useMediaQuery,
  Grid,
  Card,
  CardContent,
  CardActions,
  Stack,
} from '@mui/material';
import {
  DataGrid,
  GridToolbar,
  type GridColDef,
  type GridRowsProp,
  GridActionsCellItem,
} from '@mui/x-data-grid';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import LockClockIcon from '@mui/icons-material/LockClock';
import DonationFormModal from '../components/DonationFormModal';

const EDIT_WINDOW_MS = 3 * 60 * 1000;
const PAYSTACK_REFERENCE_TEXT = 'online donation via paystack. reference:';

function canEditManualDonation(row: any) {
  const details = String(row?.details || '').toLowerCase();
  if (details.includes(PAYSTACK_REFERENCE_TEXT)) {
    return false;
  }

  const createdAt = new Date(row?.donationDate).getTime();
  if (!Number.isFinite(createdAt)) {
    return false;
  }

  const elapsed = Date.now() - createdAt;
  return elapsed >= 0 && elapsed <= EDIT_WINDOW_MS;
}

function getRemainingEditSeconds(row: any) {
  const createdAt = new Date(row?.donationDate).getTime();
  if (!Number.isFinite(createdAt)) return 0;
  const remainingMs = EDIT_WINDOW_MS - (Date.now() - createdAt);
  return Math.max(0, Math.floor(remainingMs / 1000));
}

export default function DonationsPage() {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm')); // phones
  const isSm = useMediaQuery(theme.breakpoints.down('md')); // tablets
  const isMdUp = useMediaQuery(theme.breakpoints.up('md')); // desktop

  const [rows, setRows] = useState<GridRowsProp>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<any>(null);

  /** Fetch donations */
  const fetchDonations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/donations');
      setRows(response.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch donations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDonations();
    const timer = window.setInterval(() => {
      setRows((prev) => [...prev]);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [fetchDonations]);

  /** Add or update donation */
  const handleSave = async (data: any) => {
    setIsSaving(true);
    const dataToSave = {
      ...data,
      amount: data.type === 'Financial' && data.amount ? parseFloat(data.amount) : null,
      donationDate: data.donationDate ? new Date(data.donationDate) : new Date(),
    };

    try {
      if (itemToEdit) {
        await apiClient.patch(`/donations/${itemToEdit.id}`, dataToSave);
        toast.success('Donation updated!');
      } else {
        await apiClient.post('/donations', dataToSave);
        toast.success('Donation added!');
      }
      await fetchDonations();
      handleCloseFormModal();
    } catch (error) {
      const typedError = error as { response?: { data?: { message?: string } } };
      console.error(error);
      toast.error(
        typedError?.response?.data?.message || 'Failed to save donation.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  /** Modal & action handlers */
  const handleOpenFormModal = () => setFormModalOpen(true);
  const handleCloseFormModal = () => {
    setItemToEdit(null);
    setFormModalOpen(false);
  };
  const handleEditClick = (id: number) => () => {
    const item = (rows || []).find((row: any) => row.id === id);
    if (!item || !canEditManualDonation(item)) {
      toast.error(
        'This donation is locked. Only manual entries can be edited within 3 minutes.',
      );
      return;
    }
    setItemToEdit({
      ...item,
      donationDate: item?.donationDate ? new Date(item.donationDate).toISOString().split('T')[0] : undefined,
    });
    handleOpenFormModal();
  };

  /** Columns (responsive: hide less important columns on small screens) */
  const columns: GridColDef[] = useMemo(
    () => [
      { field: 'donorName', headerName: 'Donor Name', flex: 1, minWidth: 140 },
      {
        field: 'type',
        headerName: 'Type',
        width: 120,
        renderCell: (params) => (
          <Chip
            label={params.value}
            color={params.value === 'Financial' ? 'success' : 'info'}
            variant="outlined"
            size="small"
          />
        ),
      },
      {
        field: 'amount',
        headerName: 'Amount',
        type: 'number',
        width: 140,
        valueFormatter: (value: any) => {
          if (typeof value === 'number') {
            return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(value);
          }
          return '';
        },
      },
      { field: 'details', headerName: 'Details', flex: 1, minWidth: 160 },
      {
        field: 'donationDate',
        headerName: 'Date',
        type: 'date',
        width: 140,
        valueGetter: (value: any) => (value ? new Date(value) : null),
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: 'Actions',
        width: 120,
        getActions: ({ id, row }) => {
          const editable = canEditManualDonation(row);
          const secondsLeft = getRemainingEditSeconds(row);
          return [
            <GridActionsCellItem
              key="edit"
              icon={editable ? <EditIcon /> : <LockClockIcon />}
              label={
                editable
                  ? `Edit (${secondsLeft}s left)`
                  : 'Locked (not editable)'
              }
              onClick={handleEditClick(id as number)}
              disabled={!editable}
              showInMenu={isXs}
            />,
          ];
        },
      },
    ],
    [isXs, isSm]
  );

  // Mobile card list for small screens
  const renderCardList = (data: any[]) => {
    if (!data || data.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary">No donations found.</Typography>
        </Box>
      );
    }

    return (
      <Grid container spacing={2}>
        {data.map((row: any) => (
          <Grid item xs={12} key={row.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start' }}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
                      {row.donorName}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                      <Chip label={row.type} size="small" />
                      {row.amount != null && (
                        <Chip
                          label={new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(row.amount)}
                          size="small"
                        />
                      )}
                    </Stack>

                    {row.details && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, wordBreak: 'break-word' }}>
                        {row.details}
                      </Typography>
                    )}

                    {row.donationDate && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {new Date(row.donationDate).toLocaleDateString()}
                      </Typography>
                    )}
                  </Box>

                  <CardActions sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
                    <Button
                      size="small"
                      startIcon={canEditManualDonation(row) ? <EditIcon /> : <LockClockIcon />}
                      onClick={handleEditClick(row.id)}
                      disabled={!canEditManualDonation(row)}
                    >
                      {canEditManualDonation(row)
                        ? `Edit (${getRemainingEditSeconds(row)}s)`
                        : 'Locked'}
                    </Button>
                  </CardActions>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Paper
      sx={{
        p: { xs: 1, sm: 2 },
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: { xs: 'auto', md: '80vh' },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
          mb: 2,
        }}
      >
        <Box>
          <Typography variant={isXs ? 'h6' : 'h5'}>Donations History</Typography>
          <Typography variant="body2" color="text.secondary">
            Donation records are audit-protected. Manual entries are editable for 3 minutes only.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenFormModal}
          fullWidth={isXs}
          sx={{ maxWidth: { sm: 220 } }}
        >
          Add Donation
        </Button>
      </Box>

      {/* Table / Cards */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {isMdUp ? (
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            slots={{ toolbar: GridToolbar }}
            slotProps={{ toolbar: { showQuickFilter: true } }}
            autoHeight={false}
            density={isSm ? 'compact' : 'standard'}
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
              sorting: { sortModel: [{ field: 'donationDate', sort: 'desc' }] },
              columns: {
                columnVisibilityModel: {
                  donorName: !isXs,
                  amount: !isSm,
                  details: !isXs,
                  donationDate: !isXs,
                },
              },
            }}
            disableRowSelectionOnClick
            sx={{
              minHeight: 400,
              '& .MuiDataGrid-row': { maxHeight: 'none !important' },
            }}
          />
        ) : (
          renderCardList(rows as any[])
        )}
      </Box>

      {/* Donation Form Modal */}
      <DonationFormModal
        open={formModalOpen}
        onClose={handleCloseFormModal}
        onSave={handleSave}
        initialData={itemToEdit}
        loading={isSaving} // ✅ Pass loading state here
      />
    </Paper>
  );
}
