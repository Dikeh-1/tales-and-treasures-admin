import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Fade,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { DataGrid, type GridColDef, GridToolbar } from '@mui/x-data-grid';
import { toast } from 'react-hot-toast';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PendingIcon from '@mui/icons-material/Pending';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import HistoryIcon from '@mui/icons-material/History';
import apiClient from '../api/apiClient';
import LoadingOverlay from '../components/LoadingOverlay';
import DonationRequestDetailsModal, {
  type DonationRequestDetails,
} from '../components/DonationRequestDetailsModal';

type EndpointType = 'book-donations' | 'other-donations';

type DonationRequest = DonationRequestDetails & {
  endpoint: EndpointType;
};

type RawBookDonation = {
  id: number;
  name: string;
  email?: string;
  phone: string;
  bookQty?: number;
  bookCondition?: string;
  deliveryMethod?: string;
  pickupAddress?: string;
  status?: string;
  createdAt?: string;
};

type RawOtherDonation = {
  id: number;
  name: string;
  email?: string;
  phone: string;
  contributionType?: string;
  description?: string;
  status?: string;
  createdAt?: string;
};

function normalizeStatus(status: string | undefined) {
  if (!status) return 'Pending';
  const normalized = status.toLowerCase();
  if (normalized === 'approved' || normalized === 'success') return 'Approved';
  if (normalized === 'rejected' || normalized === 'failed') return 'Rejected';
  return 'Pending';
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function mapBookRequest(item: RawBookDonation): DonationRequest {
  return {
    id: item.id,
    requestType: 'Book',
    name: item.name || 'Anonymous',
    email: item.email || '',
    phone: item.phone || '',
    status: normalizeStatus(item.status),
    createdAt: item.createdAt || new Date().toISOString(),
    summary: `${item.bookQty ?? 0} book(s)`,
    description:
      item.deliveryMethod === 'pickup' && item.pickupAddress
        ? `Pickup address: ${item.pickupAddress}`
        : 'No additional notes provided.',
    bookQty: item.bookQty ?? 0,
    bookCondition: item.bookCondition || '',
    deliveryMethod: item.deliveryMethod || '',
    pickupAddress: item.pickupAddress || '',
    endpoint: 'book-donations',
  };
}

function mapOtherRequest(item: RawOtherDonation): DonationRequest {
  const contributionType = item.contributionType || 'other';
  return {
    id: item.id,
    requestType: 'Other',
    name: item.name || 'Anonymous',
    email: item.email || '',
    phone: item.phone || '',
    status: normalizeStatus(item.status),
    createdAt: item.createdAt || new Date().toISOString(),
    summary: contributionType.replace(/^\w/, (char) => char.toUpperCase()),
    description: item.description || 'No additional notes provided.',
    contributionType,
    endpoint: 'other-donations',
  };
}

export default function DonationTrackerPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [requests, setRequests] = useState<DonationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabValue, setTabValue] = useState(0);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DonationRequest | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<DonationRequest | null>(null);

  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [actionRequest, setActionRequest] = useState<DonationRequest | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const [bookResponse, otherResponse] = await Promise.all([
        apiClient.get('/book-donations'),
        apiClient.get('/other-donations'),
      ]);

      const mappedBooks = Array.isArray(bookResponse.data)
        ? bookResponse.data.map((item: RawBookDonation) => mapBookRequest(item))
        : [];
      const mappedOthers = Array.isArray(otherResponse.data)
        ? otherResponse.data.map((item: RawOtherDonation) => mapOtherRequest(item))
        : [];

      const combined = [...mappedBooks, ...mappedOthers].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setRequests(combined);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch donation requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const filteredRequests = useMemo(() => {
    let data = requests;
    data =
      tabValue === 0
        ? data.filter((request) => request.status === 'Pending')
        : data.filter((request) => request.status !== 'Pending');

    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase();
    return data.filter((request) => {
      return (
        request.name.toLowerCase().includes(query) ||
        request.summary.toLowerCase().includes(query) ||
        request.requestType.toLowerCase().includes(query) ||
        (request.email || '').toLowerCase().includes(query)
      );
    });
  }, [requests, searchQuery, tabValue]);

  const closeActionMenu = () => {
    setActionMenuAnchor(null);
    setActionRequest(null);
  };

  const handleActionMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    request: DonationRequest,
  ) => {
    event.stopPropagation();
    setActionRequest(request);
    setActionMenuAnchor(event.currentTarget);
  };

  const handleUpdateStatus = async (
    request: DonationRequest,
    status: 'Approved' | 'Rejected',
  ) => {
    closeActionMenu();
    const toastId = toast.loading(`Marking request as ${status}...`);
    try {
      await apiClient.patch(`/${request.endpoint}/${request.id}`, { status });
      setRequests((prev) =>
        prev.map((item) => (item.endpoint === request.endpoint && item.id === request.id ? { ...item, status } : item)),
      );
      if (selectedRequest?.id === request.id && selectedRequest.endpoint === request.endpoint) {
        setSelectedRequest((prev) => (prev ? { ...prev, status } : prev));
      }

      // When a request is approved, create a record in the main donations history
      if (status === 'Approved') {
        try {
          const donationType = request.requestType === 'Book' ? 'Book' : 'Other';
          let details: string;
          if (request.requestType === 'Book') {
            const conditionPart = request.bookCondition ? `, condition: ${request.bookCondition}` : '';
            const deliveryPart = request.deliveryMethod ? `, delivery: ${request.deliveryMethod}` : '';
            const addressPart = request.pickupAddress ? `, pickup address: ${request.pickupAddress}` : '';
            details = `Book donation: ${request.bookQty ?? 0} book(s)${conditionPart}${deliveryPart}${addressPart}.`;
          } else {
            const typePart = request.contributionType
              ? request.contributionType.charAt(0).toUpperCase() + request.contributionType.slice(1)
              : 'Other';
            details = `${typePart} donation${request.description ? ': ' + request.description : ''}.`;
          }
          await apiClient.post('/donations', {
            donorName: request.name,
            type: donationType,
            amount: null,
            details,
            donationDate: new Date().toISOString(),
          });
        } catch (donationErr) {
          // Non-fatal — status was already updated successfully
          console.error('Failed to record approved donation in history:', donationErr);
        }
      }

      toast.success(`Request ${status.toLowerCase()}.`, { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Failed to update request status.', { id: toastId });
    }
  };

  const requestDelete = (request: DonationRequest) => {
    closeActionMenu();
    setRequestToDelete(request);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!requestToDelete) return;
    setDeleteModalOpen(false);
    const toastId = toast.loading('Deleting request...');
    try {
      await apiClient.delete(`/${requestToDelete.endpoint}/${requestToDelete.id}`);
      setRequests((prev) =>
        prev.filter(
          (item) =>
            !(item.endpoint === requestToDelete.endpoint && item.id === requestToDelete.id),
        ),
      );
      if (selectedRequest?.id === requestToDelete.id) {
        setDetailsModalOpen(false);
      }
      toast.success('Request deleted.', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Delete failed.', { id: toastId });
    } finally {
      setRequestToDelete(null);
    }
  };

  const columns: GridColDef<DonationRequest>[] = [
    {
      field: 'summary',
      headerName: 'Donation',
      flex: 1.6,
      minWidth: 220,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip
            label={row.requestType}
            size="small"
            color={row.requestType === 'Book' ? 'primary' : 'secondary'}
            variant="outlined"
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={700} variant="body2" noWrap>
              {row.summary}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {row.requestType === 'Book'
                ? `${row.bookCondition || 'Book donation'} • ${row.bookQty ?? 0} copy`
                : row.contributionType || 'Other contribution'}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'name',
      headerName: 'Donor',
      flex: 1,
      minWidth: 160,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'grid', minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {row.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {row.email || row.phone || 'No contact info'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: ({ value }) => {
        const status = value || 'Pending';
        const color =
          status === 'Approved'
            ? 'success'
            : status === 'Rejected'
              ? 'error'
              : 'warning';
        const icon =
          status === 'Approved' ? (
            <CheckCircleIcon fontSize="small" />
          ) : status === 'Rejected' ? (
            <CancelIcon fontSize="small" />
          ) : (
            <PendingIcon fontSize="small" />
          );

        return (
          <Chip
            label={status}
            color={color}
            size="small"
            icon={icon}
            variant={status === 'Pending' ? 'outlined' : 'filled'}
            sx={{ fontWeight: 600 }}
          />
        );
      },
    },
    {
      field: 'createdAt',
      headerName: 'Date',
      width: 120,
      valueFormatter: (value: any) => formatDate(String(value)),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 90,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <IconButton size="small" onClick={(event) => handleActionMenuOpen(event, row)}>
          <MoreVertIcon />
        </IconButton>
      ),
    },
  ];

  const renderMobileCards = () => (
    <Stack spacing={2}>
      {filteredRequests.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8, opacity: 0.6 }}>
          <HistoryIcon sx={{ fontSize: 48, mb: 1 }} />
          <Typography>No requests found.</Typography>
        </Box>
      )}

      {filteredRequests.map((request) => (
        <Fade in key={`${request.endpoint}-${request.id}`} timeout={300}>
          <Paper
            elevation={0}
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 3,
              p: 2,
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
            }}
            onClick={() => {
              setSelectedRequest(request);
              setDetailsModalOpen(true);
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" fontWeight={700} noWrap>
                  {request.summary}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {request.requestType} • {request.name}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={(event) => handleActionMenuOpen(event, request)}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
              <Chip
                label={request.status}
                color={
                  request.status === 'Pending'
                    ? 'warning'
                    : request.status === 'Approved'
                      ? 'success'
                      : 'error'
                }
                size="small"
                variant={request.status === 'Pending' ? 'outlined' : 'filled'}
              />
              <Typography variant="caption" color="text.secondary">
                {formatDate(request.createdAt)}
              </Typography>
            </Stack>
          </Paper>
        </Fade>
      ))}
    </Stack>
  );

  return (
    <Container
      maxWidth="xl"
      sx={{ p: { xs: 2, md: 3 }, minHeight: '100%', display: 'flex', flexDirection: 'column' }}
    >
      {loading && <LoadingOverlay message="Syncing requests..." />}

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{
              background: 'linear-gradient(45deg, #F59E0B, #10B981)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Donation Requests
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track and moderate incoming book and other donation requests
          </Typography>
        </Box>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 1,
          mb: 3,
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          gap: 2,
          bgcolor: 'background.paper',
        }}
      >
        <Tabs
          value={tabValue}
          onChange={(_, nextValue) => setTabValue(nextValue)}
          variant="standard"
          sx={{
            minHeight: 48,
            width: { xs: '100%', sm: 'auto' },
            '& .MuiTabs-indicator': { borderRadius: 1, height: 3 },
            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 48 },
          }}
        >
          <Tab icon={<PendingIcon fontSize="small" />} iconPosition="start" label="Pending" />
          <Tab icon={<HistoryIcon fontSize="small" />} iconPosition="start" label="History" />
        </Tabs>

        <Box sx={{ flexGrow: 1 }} />

        <TextField
          size="small"
          placeholder="Search requests..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          sx={{ width: { xs: '100%', sm: 280 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" fontSize="small" />
              </InputAdornment>
            ),
            sx: { borderRadius: 2 },
          }}
        />
      </Paper>

      <Box sx={{ flexGrow: 1, width: '100%' }}>
        {isMobile ? (
          renderMobileCards()
        ) : (
          <Paper
            elevation={0}
            sx={{
              height: 620,
              width: '100%',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <DataGrid
              rows={filteredRequests}
              columns={columns}
              slots={{ toolbar: GridToolbar }}
              slotProps={{
                toolbar: {
                  showQuickFilter: false,
                  printOptions: { disableToolbarButton: true },
                },
              }}
              sx={{ border: 'none' }}
              disableRowSelectionOnClick
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
              pageSizeOptions={[10, 25, 50]}
              onRowClick={(params) => {
                setSelectedRequest(params.row as DonationRequest);
                setDetailsModalOpen(true);
              }}
            />
          </Paper>
        )}
      </Box>

      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={closeActionMenu}
        PaperProps={{ sx: { borderRadius: 2, minWidth: 170, boxShadow: 3 } }}
      >
        <MenuItem
          onClick={() => {
            if (!actionRequest) return;
            setSelectedRequest(actionRequest);
            setDetailsModalOpen(true);
            closeActionMenu();
          }}
        >
          <VisibilityIcon fontSize="small" sx={{ mr: 1.5 }} /> View details
        </MenuItem>

        {actionRequest?.status === 'Pending' && (
          <>
            <MenuItem
              onClick={() => {
                if (actionRequest) void handleUpdateStatus(actionRequest, 'Approved');
              }}
            >
              <CheckCircleIcon fontSize="small" sx={{ mr: 1.5, color: 'success.main' }} /> Approve
            </MenuItem>
            <MenuItem
              onClick={() => {
                if (actionRequest) void handleUpdateStatus(actionRequest, 'Rejected');
              }}
            >
              <CancelIcon fontSize="small" sx={{ mr: 1.5, color: 'error.main' }} /> Reject
            </MenuItem>
          </>
        )}

        <MenuItem
          onClick={() => {
            if (actionRequest) requestDelete(actionRequest);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} /> Delete
        </MenuItem>
      </Menu>

      <DonationRequestDetailsModal
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        request={selectedRequest}
        onApprove={() => {
          if (selectedRequest) void handleUpdateStatus(selectedRequest, 'Approved');
        }}
        onReject={() => {
          if (selectedRequest) void handleUpdateStatus(selectedRequest, 'Rejected');
        }}
      />

      <Dialog
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle fontWeight={700}>Confirm deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this donation request?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteModalOpen(false)} sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button onClick={() => void handleDelete()} variant="contained" color="error" sx={{ borderRadius: 2 }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
