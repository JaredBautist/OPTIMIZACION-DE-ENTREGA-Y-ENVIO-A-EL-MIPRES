
import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api';

const DEFAULT_NIT = '800012189';
const DEFAULT_TOKEN_MASTER = '8DF6875B-EA49-48A8-B251-5947924F9824';
const DEFAULT_CONSECUTIVO = '1';
const DATE_PLACEHOLDER = 'aaaa-mm-dd';
const ENVIO_TYPES = new Set(['EntregaAmbito', 'ReporteEntrega', 'Facturacion']);
const NETWORK_ERROR_KEYWORDS = [
  'connect',
  'econn',
  'timeout',
  'refused',
  'etimedout',
  'econnrefused',
  'enotfound',
];

const TIPO_TEC_OPTIONS = [
  { value: 'S', label: 'S - Suministro' },
  { value: 'M', label: 'M - Medicamento' },
  { value: 'P', label: 'P - Procedimiento' },
  { value: 'D', label: 'D - Dispositivo' },
  { value: 'N', label: 'N - Producto Nutricional' },
];

const TIPO_ID_OPTIONS = [
  { value: 'CC', label: 'CC - Cedula de ciudadania' },
  { value: 'RC', label: 'RC - Registro Civil' },
  { value: 'TI', label: 'TI - Tarjeta de identidad' },
  { value: 'CE', label: 'CE - Cedula de Extranjeria' },
  { value: 'PA', label: 'PA - Pasaporte' },
  { value: 'NV', label: 'NV - Nacido Vivo' },
  { value: 'CD', label: 'CD - Carne Diplomatico' },
  { value: 'SC', label: 'SC - Pasaporte de la ONU' },
  { value: 'PE', label: 'PE - Permiso Especial de Permanencia' },
];

const EPS_OPTIONS = [
  { name: 'NUEVAS EPS', id: '900156264', code: 'EPS037' },
  { name: 'COMFAORIENTE', id: '890500675', code: 'CFC050' },
  { name: 'COOSALUD', id: '900226715', code: 'EPS042' },
  { name: 'COOMPENSAR', id: '860066942', code: 'EPS008' },
  { name: 'SANITAS', id: '800251440', code: 'EPS005' },
  { name: 'EPS SURA', id: '800088702', code: 'EPS010' },
];

const EPS_CODE_MAP = EPS_OPTIONS.reduce((acc, option) => {
  acc[option.id] = option.code;
  return acc;
}, {});

const entregaToFacturacionFieldMap = {
  NoPrescripcion: 'NoPrescripcion',
  TipoTec: 'TipoTec',
  TipoIDPaciente: 'TipoIDPaciente',
  NoIDPaciente: 'NoIDPaciente',
  CodSerTecEntregado: 'CodSerTecAEntregado',
  CantTotEntregada: 'CantUnMinDis',
};

const facturacionToEntregaFieldMap = Object.entries(
  entregaToFacturacionFieldMap,
).reduce((map, [entregaField, factField]) => {
  map[factField] = entregaField;
  return map;
}, {});

const facturacionToReporteFieldMap = {
  ValorTotFacturado: 'ValorEntregado',
};

const reporteToFacturacionFieldMap = {
  ValorEntregado: 'ValorTotFacturado',
};

const formatDateInputValue = (value) => {
  if (!value) {
    return '';
  }
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) {
    return digits;
  }
  if (digits.length <= 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
};

const convertDisplayDateToIso = (value) => {
  if (!value) {
    return '';
  }
  const trimmed = value.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return trimmed;
  }
  const displayMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (displayMatch) {
    const [, day, month, year] = displayMatch;
    return `${year.padStart(4, '0')}-${month.padStart(
      2,
      '0',
    )}-${day.padStart(2, '0')}`;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 8) {
    const year = digits.slice(0, 4);
    const month = digits.slice(4, 6);
    const day = digits.slice(6, 8);
    return `${year}-${month}-${day}`;
  }
  return '';
};

const convertIsoToDisplay = (value) => {
  if (!value) {
    return '';
  }
  const iso = convertDisplayDateToIso(value);
  return iso || formatDateInputValue(value);
};

const getSummaryDate = (value) => {
  if (!value) {
    return '';
  }
  const iso = convertDisplayDateToIso(value);
  return iso || formatDateInputValue(value);
};

const sanitizeString = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
};

const getFirstDataRecord = (payload) => {
  if (!payload) {
    return null;
  }
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) {
    return data.length ? data[0] ?? null : null;
  }
  if (typeof data === 'object' && data !== null) {
    return data;
  }
  return null;
};

const extractFields = (record, mapping) => {
  const result = {};
  Object.entries(mapping).forEach(([key, fields]) => {
    let value = null;
    if (record) {
      for (const field of fields) {
        if (
          Object.prototype.hasOwnProperty.call(record, field) &&
          record[field] !== undefined &&
          record[field] !== null
        ) {
          value = record[field];
          break;
        }
      }
    }
    result[key] = value ?? null;
  });
  return result;
};

const deriveErrorMessage = (payload) => {
  if (payload === null || payload === undefined) {
    return 'Error desconocido';
  }
  if (typeof payload === 'string') {
    return payload;
  }
  if (typeof payload === 'number' || typeof payload === 'boolean') {
    return String(payload);
  }
  if (payload.message) {
    return String(payload.message);
  }
  if (payload.error) {
    return String(payload.error);
  }
  if (payload.data) {
    return deriveErrorMessage(payload.data);
  }
  try {
    return JSON.stringify(payload);
  } catch {
    return 'Error desconocido';
  }
};

const isSuccessfulEntry = (entry) => {
  if (!entry) {
    return false;
  }
  if (typeof entry.ok === 'boolean') {
    return entry.ok;
  }
  const numericStatus =
    typeof entry.status === 'number' ? entry.status : Number(entry.status);
  if (!Number.isFinite(numericStatus)) {
    return false;
  }
  return numericStatus >= 200 && numericStatus < 300;
};

const resolveOperationSuccess = (ok, data) => {
  if (data && typeof data.success === 'boolean') {
    return data.success;
  }
  return ok;
};

const deriveNormalizedErrorMessage = (data) =>
  deriveErrorMessage(data).toLowerCase();

const isConnectionErrorResponse = (status, data) => {
  if (status === 0) {
    return true;
  }
  const message = deriveNormalizedErrorMessage(data);
  return NETWORK_ERROR_KEYWORDS.some((keyword) =>
    message.includes(keyword),
  );
};

const isSameDay = (value, referenceDate = new Date()) => {
  if (!value) {
    return false;
  }
  const targetDate =
    value instanceof Date ? value : new Date(value);
  if (Number.isNaN(targetDate.getTime())) {
    return false;
  }
  return (
    targetDate.getFullYear() === referenceDate.getFullYear() &&
    targetDate.getMonth() === referenceDate.getMonth() &&
    targetDate.getDate() === referenceDate.getDate()
  );
};

const filterEntriesForDay = (entries, referenceDate = new Date()) => {
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries.filter((entry) =>
    isSameDay(entry.timestamp, referenceDate),
  );
};

const getSelectedEpsValue = (noIdEps, codEps) => {
  const match = EPS_OPTIONS.find(
    (option) => option.id === noIdEps && option.code === codEps,
  );
  return match ? match.id : '';
};

const defaultEntregaForm = {
  NoPrescripcion: '',
  TipoTec: '',
  ConTec: DEFAULT_CONSECUTIVO,
  TipoIDPaciente: '',
  NoIDPaciente: '',
  NoEntrega: '1',
  CodSerTecEntregado: '',
  CantTotEntregada: '',
  EntTotal: '1',
  CausaNoEntrega: '0',
  FecEntrega: '',
  NoLote: '',
};

const defaultReporteForm = {
  ID: '',
  EstadoEntrega: '1',
  CausaNoEntrega: '0',
  ValorEntregado: '',
};

const defaultFacturacionForm = {
  NoPrescripcion: '',
  TipoTec: '',
  ConTec: DEFAULT_CONSECUTIVO,
  TipoIDPaciente: '',
  NoIDPaciente: '',
  NoEntrega: '1',
  NoSubEntrega: '1',
  NoFactura: '',
  NoIDEPS: '',
  CodEPS: '',
  CodSerTecAEntregado: '',
  CantUnMinDis: '',
  ValorUnitFacturado: '',
  ValorTotFacturado: '',
  CuotaModer: '0',
  Copago: '0',
};

function ResponsePanel({ title, response }) {
  if (!response) return null;
  const badgeClass = response.ok ? 'badge bg-success' : 'badge bg-danger';
  const statusLabel =
    response.status === 0 ? 'Error de red' : `Estado: ${response.status}`;

  return (
    <div className="response-card mt-3">
      <div className="d-flex justify-content-between align-items-center">
        <h6 className="mb-0">{title}</h6>
        <span className={badgeClass}>{statusLabel}</span>
      </div>
      <pre className="mt-3 mb-0">
        {JSON.stringify(response.data ?? {}, null, 2)}
      </pre>
    </div>
  );
}

function ToastStack({ toasts, dismiss }) {
  if (!toasts.length) return null;

  return (
    <div className="toast-stack">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-alert alert alert-${toast.variant}`}
          role="alert"
        >
          <span>{toast.message}</span>
          <button
            type="button"
            className="btn-close ms-2"
            aria-label="Cerrar"
            onClick={() => dismiss(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="stats-card">
      <div className="number">{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [jwt, setJwt] = useState(null);
  const [mipresToken, setMipresToken] = useState(null);
  const [tokenExpiry, setTokenExpiry] = useState(null);
  const [lastEntregaId, setLastEntregaId] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [includeSuccess, setIncludeSuccess] = useState(true);
  const [activeTab, setActiveTab] = useState('entrega');

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [tokenForm, setTokenForm] = useState({
    nit: DEFAULT_NIT,
    tokenMaster: DEFAULT_TOKEN_MASTER,
  });
  const [entregaForm, setEntregaForm] = useState(defaultEntregaForm);
  const [reporteForm, setReporteForm] = useState(defaultReporteForm);
  const [facturacionForm, setFacturacionForm] = useState(
    defaultFacturacionForm,
  );
  const epsSelectValue = useMemo(
    () =>
      getSelectedEpsValue(
        facturacionForm.NoIDEPS,
        facturacionForm.CodEPS,
      ),
    [facturacionForm.NoIDEPS, facturacionForm.CodEPS],
  );

  const [responses, setResponses] = useState({
    token: null,
    entrega: null,
    reporte: null,
    facturacion: null,
  });

  const [loading, setLoading] = useState({
    token: false,
    entrega: false,
    reporte: false,
    facturacion: false,
  });

  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const storedJwt = localStorage.getItem('mipres_jwt');
    const storedToken = localStorage.getItem('mipres_token');
    const storedExpiry = localStorage.getItem('mipres_token_expiry');
    const storedSubs =
      JSON.parse(localStorage.getItem('mipres_submissions') || '[]') ?? [];
    const storedEntregaId = localStorage.getItem('mipres_last_entrega_id');
    const storedNit = localStorage.getItem('mipres_last_nit');
    const storedTokenMaster = localStorage.getItem(
      'mipres_last_token_master',
    );

    if (storedJwt) {
      setJwt(storedJwt);
      setIsAuthenticated(true);
    }
    if (storedToken) {
      setMipresToken(storedToken);
    }
    if (storedExpiry) {
      const expiryDate = new Date(storedExpiry);
      if (!Number.isNaN(expiryDate.getTime())) {
        setTokenExpiry(expiryDate);
      }
    }
    if (storedSubs.length) {
      const today = new Date();
      const todaysSubs = filterEntriesForDay(storedSubs, today);
      setSubmissions(todaysSubs);
    }
    if (storedEntregaId) {
      const parsed = Number(storedEntregaId);
      if (!Number.isNaN(parsed)) {
        setLastEntregaId(parsed);
      }
    }
    setTokenForm({
      nit:
        storedNit && storedNit.trim().length
          ? storedNit
          : DEFAULT_NIT,
      tokenMaster:
        storedTokenMaster && storedTokenMaster.trim().length
          ? storedTokenMaster
          : DEFAULT_TOKEN_MASTER,
    });
  }, []);

  useEffect(() => {
    if (jwt && isAuthenticated) {
      localStorage.setItem('mipres_jwt', jwt);
    } else {
      localStorage.removeItem('mipres_jwt');
    }
  }, [jwt, isAuthenticated]);

  useEffect(() => {
    if (mipresToken) {
      localStorage.setItem('mipres_token', mipresToken);
    } else {
      localStorage.removeItem('mipres_token');
    }
  }, [mipresToken]);

  useEffect(() => {
    if (tokenExpiry) {
      localStorage.setItem('mipres_token_expiry', tokenExpiry.toISOString());
    } else {
      localStorage.removeItem('mipres_token_expiry');
    }
  }, [tokenExpiry]);

  useEffect(() => {
    localStorage.setItem('mipres_submissions', JSON.stringify(submissions));
  }, [submissions]);

  useEffect(() => {
    if (lastEntregaId) {
      localStorage.setItem('mipres_last_entrega_id', String(lastEntregaId));
    } else {
      localStorage.removeItem('mipres_last_entrega_id');
    }
  }, [lastEntregaId]);

  useEffect(() => {
    if (lastEntregaId) {
      setReporteForm((prev) => ({
        ...prev,
        ID: String(lastEntregaId),
      }));
    }
  }, [lastEntregaId]);
  const addToast = useCallback((message, variant = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const handleEntregaFieldChange = useCallback((field, value) => {
    setEntregaForm((prev) => ({ ...prev, [field]: value }));
    const targetFactField = entregaToFacturacionFieldMap[field];
    if (targetFactField) {
      setFacturacionForm((prev) => ({ ...prev, [targetFactField]: value }));
    }
  }, []);

  const handleFacturacionFieldChange = useCallback((field, value) => {
    setFacturacionForm((prev) => ({ ...prev, [field]: value }));
    const entregaField = facturacionToEntregaFieldMap[field];
    if (entregaField) {
      setEntregaForm((prev) => ({ ...prev, [entregaField]: value }));
    }
    const reporteField = facturacionToReporteFieldMap[field];
    if (reporteField) {
      setReporteForm((prev) => ({ ...prev, [reporteField]: value }));
    }

    if (field === 'NoIDEPS') {
      const normalized = value.trim();
      const mapped = EPS_CODE_MAP[normalized];
      if (mapped) {
        setFacturacionForm((prev) => ({ ...prev, CodEPS: mapped }));
      }
    }
  }, []);

  const handleReporteFieldChange = useCallback((field, value) => {
    setReporteForm((prev) => ({ ...prev, [field]: value }));
    const factField = reporteToFacturacionFieldMap[field];
    if (factField) {
      setFacturacionForm((prev) => ({ ...prev, [factField]: value }));
    }
  }, []);

  const handleEpsSelectChange = useCallback(
    (value) => {
      const option = EPS_OPTIONS.find((eps) => eps.id === value);
      if (!option) {
        return;
      }
      handleFacturacionFieldChange('NoIDEPS', option.id);
      setFacturacionForm((prev) => ({ ...prev, CodEPS: option.code }));
    },
    [handleFacturacionFieldChange],
  );

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setJwt(null);
    setMipresToken(null);
    setTokenExpiry(null);
    setLastEntregaId(null);
    setSubmissions([]);
    setEntregaForm({ ...defaultEntregaForm });
    setReporteForm({ ...defaultReporteForm });
    setFacturacionForm({ ...defaultFacturacionForm });
    setResponses({
      token: null,
      entrega: null,
      reporte: null,
      facturacion: null,
    });
    localStorage.removeItem('mipres_submissions');
    localStorage.removeItem('mipres_last_entrega_id');
  }, []);
  const apiRequest = useCallback(
    async (path, { method = 'GET', body, useJwt = true } = {}) => {
      const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      if (useJwt && jwt) {
        headers.Authorization = `Bearer ${jwt}`;
      }

      try {
        const response = await fetch(`${API_BASE}${path}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });

        let data = null;
        try {
          data = await response.json();
        } catch {
          data = null;
        }

        if (response.status === 401 && useJwt) {
          handleLogout();
          addToast('Sesion expirada. Vuelve a iniciar sesion.', 'warning');
        }

        return { ok: response.ok, status: response.status, data };
      } catch (error) {
        return {
          ok: false,
          status: 0,
          data: { message: error instanceof Error ? error.message : String(error) },
        };
      }
    },
    [jwt, handleLogout, addToast],
  );

  const addSubmission = useCallback(
    (
      type,
      requestBody,
      response,
      status,
      responseId = null,
      wasSuccessful = undefined,
    ) => {
      const successFlag =
        typeof wasSuccessful === 'boolean'
          ? wasSuccessful
          : isSuccessfulEntry({ status });
      const entry = {
        id: Date.now(),
        type,
        request: requestBody,
        response,
        status,
        responseId,
        ok: successFlag,
        timestamp: new Date().toISOString(),
      };
      setSubmissions((prev) => {
        const referenceDate = new Date(entry.timestamp);
        const todaysPrev = filterEntriesForDay(prev, referenceDate);
        return [...todaysPrev, entry];
      });
    },
    [],
  );
  const handleLogin = async (event) => {
    event.preventDefault();
    if (!loginForm.username || !loginForm.password) {
      addToast('Ingrese usuario y contrasena', 'warning');
      return;
    }

    const { ok, status, data } = await apiRequest('/login', {
      method: 'POST',
      body: {
        username: loginForm.username.trim(),
        password: loginForm.password.trim(),
      },
      useJwt: false,
    });

    setResponses((prev) => ({
      ...prev,
      login: { ok, status, data },
    }));

    if (ok && data?.token) {
      setJwt(data.token);
      setIsAuthenticated(true);
      addToast('Inicio de sesion exitoso. !Bienvenido!');
      setLoginForm({ username: '', password: '' });
    } else {
      addToast(data?.message || 'Error de autenticacion', 'danger');
    }
  };

  const handleGenerateToken = async (event) => {
    event.preventDefault();
    if (!isAuthenticated) {
      addToast('Inicie sesion primero', 'danger');
      return;
    }

    const normalizedNit = tokenForm.nit.trim() || DEFAULT_NIT;
    const normalizedTokenMaster =
      tokenForm.tokenMaster.trim() || DEFAULT_TOKEN_MASTER;

    setLoading((prev) => ({ ...prev, token: true }));

    const { ok, status, data } = await apiRequest('/mipres/token', {
      method: 'POST',
      body: {
        nit: normalizedNit,
        token: normalizedTokenMaster,
      },
    });

    setLoading((prev) => ({ ...prev, token: false }));
    setResponses((prev) => ({
      ...prev,
      token: { ok, status, data },
    }));

    const wasSuccessful = resolveOperationSuccess(ok, data);
    const connectionIssue = isConnectionErrorResponse(status, data);
    if (connectionIssue) {
      addToast('Error de conexion con MIPRES. Intenta nuevamente.', 'danger');
      return;
    }

    const raw = data?.data;
    const extracted =
      typeof raw === 'string' ? raw : raw?.Token ?? raw?.token ?? null;

    if (wasSuccessful && extracted) {
      setMipresToken(extracted);
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      setTokenExpiry(expiry);
      localStorage.setItem('mipres_last_nit', normalizedNit);
      localStorage.setItem(
        'mipres_last_token_master',
        normalizedTokenMaster,
      );
      setTokenForm({
        nit: normalizedNit,
        tokenMaster: normalizedTokenMaster,
      });
      addToast('Token diario generado correctamente');
    } else {
      addToast(data?.message || 'No se pudo generar token', 'danger');
    }
    addSubmission('Token', { nit: normalizedNit }, data, status, null, wasSuccessful);
  };
  const handleEntregaSubmit = async (event) => {
    event.preventDefault();
    if (!mipresToken) {
      addToast('Debe generar un token primero', 'danger');
      return;
    }

    const isoDeliveryDate = convertDisplayDateToIso(entregaForm.FecEntrega);
    if (!isoDeliveryDate || Number.isNaN(Date.parse(isoDeliveryDate))) {
      addToast(
        'Fecha de entrega invalida. Usa el formato aaaa-mm-dd.',
        'danger',
      );
      return;
    }

    const body = {
      mipresToken,
      ambito: true,
      NoPrescripcion: entregaForm.NoPrescripcion.trim(),
      TipoTec: entregaForm.TipoTec.trim(),
      ConTec: Number(DEFAULT_CONSECUTIVO),
      TipoIDPaciente: entregaForm.TipoIDPaciente.trim(),
      NoIDPaciente: entregaForm.NoIDPaciente.trim(),
      NoEntrega: Number(entregaForm.NoEntrega || 0),
      CodSerTecEntregado: entregaForm.CodSerTecEntregado.trim(),
      CantTotEntregada: entregaForm.CantTotEntregada.trim(),
      EntTotal: Number(entregaForm.EntTotal || 0),
      CausaNoEntrega: Number(entregaForm.CausaNoEntrega || 0),
      FecEntrega: isoDeliveryDate,
      NoLote: entregaForm.NoLote.trim(),
    };

    setLoading((prev) => ({ ...prev, entrega: true }));
    const { ok, status, data } = await apiRequest('/mipres/entrega', {
      method: 'PUT',
      body,
    });
    setLoading((prev) => ({ ...prev, entrega: false }));

    setResponses((prev) => ({
      ...prev,
      entrega: { ok, status, data },
    }));

    const responseId =
      data?.data?.ID ?? data?.data?.Id ?? data?.data?.id ?? null;
    const wasSuccessful = resolveOperationSuccess(ok, data);
    const connectionIssue = isConnectionErrorResponse(status, data);
    if (connectionIssue) {
      addToast('Error de conexion con MIPRES. Intenta nuevamente.', 'danger');
      return;
    }

    if (wasSuccessful) {
      const id = responseId ?? Date.now();
      setLastEntregaId(id);
      setEntregaForm((prev) => ({
        ...prev,
        FecEntrega: convertIsoToDisplay(isoDeliveryDate),
      }));
      addToast(`Entrega registrada correctamente. ID: ${id}`);
    } else {
      addToast(data?.message || 'Error registrando entrega', 'danger');
    }

    addSubmission(
      'EntregaAmbito',
      body,
      data,
      status,
      responseId,
      wasSuccessful,
    );
  };

  const handleReporteSubmit = async (event) => {
    event.preventDefault();
    if (!mipresToken) {
      addToast('Debe generar un token primero', 'danger');
      return;
    }

    const body = {
      mipresToken,
      ID: Number(reporteForm.ID || 0),
      EstadoEntrega: Number(reporteForm.EstadoEntrega || 0),
      CausaNoEntrega: Number(reporteForm.CausaNoEntrega || 0),
      ValorEntregado: reporteForm.ValorEntregado.trim(),
    };

    setLoading((prev) => ({ ...prev, reporte: true }));
    const { ok, status, data } = await apiRequest('/mipres/reporte', {
      method: 'PUT',
      body,
    });
    setLoading((prev) => ({ ...prev, reporte: false }));

    setResponses((prev) => ({
      ...prev,
      reporte: { ok, status, data },
    }));

    const responseId =
      data?.data?.ID ?? data?.data?.Id ?? data?.data?.id ?? null;
    const wasSuccessful = resolveOperationSuccess(ok, data);
    const connectionIssue = isConnectionErrorResponse(status, data);
    if (connectionIssue) {
      addToast('Error de conexion con MIPRES. Intenta nuevamente.', 'danger');
      return;
    }

    if (wasSuccessful) {
      addToast('Reporte de entrega registrado correctamente');
    } else {
      addToast(data?.message || 'Error registrando reporte', 'danger');
    }

    addSubmission(
      'ReporteEntrega',
      body,
      data,
      status,
      responseId,
      wasSuccessful,
    );
  };
  const handleFacturacionSubmit = async (event) => {
    event.preventDefault();
    if (!mipresToken) {
      addToast('Debe generar un token primero', 'danger');
      return;
    }

    const body = {
      mipresToken,
      NoPrescripcion: facturacionForm.NoPrescripcion.trim(),
      TipoTec: facturacionForm.TipoTec.trim(),
      ConTec: Number(DEFAULT_CONSECUTIVO),
      TipoIDPaciente: facturacionForm.TipoIDPaciente.trim(),
      NoIDPaciente: facturacionForm.NoIDPaciente.trim(),
      NoEntrega: Number(facturacionForm.NoEntrega || 0),
      NoSubEntrega: Number(facturacionForm.NoSubEntrega || 0),
      NoFactura: facturacionForm.NoFactura.trim(),
      NoIDEPS: facturacionForm.NoIDEPS.trim(),
      CodEPS: facturacionForm.CodEPS.trim(),
      CodSerTecAEntregado: facturacionForm.CodSerTecAEntregado.trim(),
      CantUnMinDis: facturacionForm.CantUnMinDis.trim(),
      ValorUnitFacturado: facturacionForm.ValorUnitFacturado.trim(),
      ValorTotFacturado: facturacionForm.ValorTotFacturado.trim(),
      CuotaModer: '0',
      Copago: '0',
    };

    setLoading((prev) => ({ ...prev, facturacion: true }));
    const { ok, status, data } = await apiRequest('/mipres/facturacion', {
      method: 'PUT',
      body,
    });
    setLoading((prev) => ({ ...prev, facturacion: false }));

    setResponses((prev) => ({
      ...prev,
      facturacion: { ok, status, data },
    }));

    const responseId =
      data?.data?.ID ?? data?.data?.Id ?? data?.data?.id ?? null;
    const wasSuccessful = resolveOperationSuccess(ok, data);
    const connectionIssue = isConnectionErrorResponse(status, data);
    if (connectionIssue) {
      addToast('Error de conexion con MIPRES. Intenta nuevamente.', 'danger');
      return;
    }

    if (wasSuccessful) {
      addToast('Facturacion registrada correctamente');
    } else {
      addToast(data?.message || 'Error registrando facturacion', 'danger');
    }

    addSubmission(
      'Facturacion',
      body,
      data,
      status,
      responseId,
      wasSuccessful,
    );
  };

  const handleDownloadReport = () => {
    const todayDate = new Date();
    const today = todayDate.toDateString();
    const todaysSubs = submissions.filter(
      (entry) => new Date(entry.timestamp).toDateString() === today,
    );
    const todaysEnvios = todaysSubs.filter((entry) =>
      ENVIO_TYPES.has(entry.type),
    );

    if (!todaysEnvios.length) {
      addToast('No hay registros para generar el reporte', 'warning');
      return;
    }

    const orderedSubs = [...todaysEnvios].reverse();
    const findLatestSuccess = (type) =>
      orderedSubs.find(
        (entry) => entry.type === type && isSuccessfulEntry(entry),
      );

    const entregaEntry = findLatestSuccess('EntregaAmbito');
    const reporteEntry = findLatestSuccess('ReporteEntrega');
    const facturacionEntry = findLatestSuccess('Facturacion');

    const todaysFacturas = todaysEnvios.filter(
      (entry) => entry.type === 'Facturacion',
    );
    const totalFacturas = todaysFacturas.length;
    const facturasExitosas = todaysFacturas.filter(isSuccessfulEntry).length;
    const facturasConError = todaysFacturas.filter(
      (entry) => !isSuccessfulEntry(entry),
    ).length;

    const fallbackFacturaRequest =
      todaysFacturas.length > 0
        ? todaysFacturas[todaysFacturas.length - 1]?.request ?? null
        : null;

    const entregaRequest = entregaEntry?.request ?? null;
    const facturacionRequest =
      facturacionEntry?.request ??
      fallbackFacturaRequest ??
      entregaRequest ??
      null;

    const summary = {
      FACTURA: sanitizeString(facturacionRequest?.NoFactura ?? ''),
      PACIENTE: sanitizeString(
        facturacionRequest?.NoIDPaciente ?? entregaRequest?.NoIDPaciente ?? '',
      ),
      FECHA:
        getSummaryDate(
          facturacionRequest?.FecEntrega ?? entregaRequest?.FecEntrega ?? '',
        ) || todayDate.toISOString().split('T')[0],
      MIPRES: sanitizeString(
        facturacionRequest?.NoPrescripcion ??
          entregaRequest?.NoPrescripcion ??
          '',
      ),
    };

    const entregaRecord = entregaEntry
      ? extractFields(getFirstDataRecord(entregaEntry.response), {
          Id: ['Id', 'ID'],
          IdEntrega: [
            'IdEntrega',
            'IDEntrega',
            'IdEntregaAmbito',
            'IDEntregaAmbito',
          ],
        })
      : { MENSAJE: 'Sin registros de entrega exitosos en el dia' };

    const reporteRecord = reporteEntry
      ? extractFields(getFirstDataRecord(reporteEntry.response), {
          Id: ['Id', 'ID'],
          IdReporteEntrega: ['IdReporteEntrega', 'IDReporteEntrega'],
        })
      : { MENSAJE: 'Sin registros de reporte exitosos en el dia' };

    const facturacionRecord = facturacionEntry
      ? extractFields(getFirstDataRecord(facturacionEntry.response), {
          Id: ['Id', 'ID'],
          IdFacturacion: ['IdFacturacion', 'IDFacturacion'],
        })
      : { MENSAJE: 'Sin registros de facturacion exitosos en el dia' };

    const buildFacturaBlock = (entry) => {
      const requestBody = entry.request ?? {};
      const responseRecordRaw = getFirstDataRecord(entry.response);
      const identifiers = extractFields(responseRecordRaw, {
        Id: ['Id', 'ID'],
        IdFacturacion: ['IdFacturacion', 'IDFacturacion'],
      });
      const responseMessageRaw =
        (responseRecordRaw && responseRecordRaw.Mensaje) ??
        entry.response?.Mensaje ??
        entry.response?.message ??
        entry.response?.data?.Mensaje ??
        null;

      const timestampDate = new Date(entry.timestamp);
      const fecha =
        Number.isNaN(timestampDate.getTime())
          ? ''
          : timestampDate.toISOString().split('T')[0];
      const successFlag = isSuccessfulEntry(entry);

      return {
        TIPO: entry.type,
        FACTURA: sanitizeString(requestBody.NoFactura ?? ''),
        PACIENTE: sanitizeString(
          requestBody.NoIDPaciente ?? entregaRequest?.NoIDPaciente ?? '',
        ),
        FECHA: fecha,
        MIPRES: sanitizeString(
          requestBody.NoPrescripcion ??
            entregaRequest?.NoPrescripcion ??
            '',
        ),
        STATUS: entry.status,
        RESULTADO: successFlag ? 'Exito' : 'Error',
        MENSAJE: successFlag
          ? sanitizeString(responseMessageRaw) || 'Registro exitoso'
          : deriveErrorMessage(entry.response),
        Id: identifiers.Id,
        IdFacturacion: identifiers.IdFacturacion,
        TIMESTAMP: entry.timestamp,
      };
    };

    const facturasToInclude =
      todaysFacturas.length > 0
        ? includeSuccess
          ? todaysFacturas
          : todaysFacturas.filter((entry) => !isSuccessfulEntry(entry))
        : [];

    const facturasBlockSummary = {
      TOTAL_FACTURAS: totalFacturas,
      FACTURAS_EXITOSAS: facturasExitosas,
      FACTURAS_CON_ERROR: facturasConError,
    };
    const facturaBlocks =
      facturasToInclude.length > 0
        ? facturasToInclude.map((entry) => buildFacturaBlock(entry))
        : [];

    const errorEntries = todaysEnvios.filter(
      (entry) => !isSuccessfulEntry(entry),
    );
    const errorRecords =
      errorEntries.length > 0
        ? errorEntries.map((entry) => ({
            TIPO: entry.type,
            STATUS: entry.status,
            MENSAJE: deriveErrorMessage(entry.response),
            REQUEST: entry.request,
            RESPUESTA: entry.response,
            TIMESTAMP: entry.timestamp,
          }))
        : [{ MENSAJE: 'Sin registros de error' }];

    const outputBlocks = [
      summary,
      entregaRecord,
      reporteRecord,
      facturacionRecord,
    ];

    const payloadSections = [
      ...outputBlocks.map((block) => JSON.stringify(block, null, 2)),
      'FACTURAS_DEL_DIA:',
      JSON.stringify(facturasBlockSummary, null, 2),
      ...facturaBlocks.map((block) => JSON.stringify(block, null, 2)),
      'ERRORES:',
      ...errorRecords.map((block) => JSON.stringify(block, null, 2)),
    ];

    const payload = payloadSections.join('\n\n');
    const blob = new Blob([payload], {
      type: 'application/json;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0];
    link.download = `mipres_reporte_${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addToast('Reporte descargado correctamente');
  };

  const stats = useMemo(() => {
    const envioEntries = submissions.filter((entry) =>
      ENVIO_TYPES.has(entry.type),
    );
    const total = envioEntries.length;
    const todayCount = envioEntries.length;
    const success = envioEntries.filter(isSuccessfulEntry).length;
    const errors = envioEntries.filter(
      (entry) => !isSuccessfulEntry(entry),
    ).length;

    return {
      total,
      today: todayCount,
      success,
      errors,
    };
  }, [submissions]);

  const tokenExpiryLabel = tokenExpiry
    ? tokenExpiry.toLocaleString()
    : 'N/D';
  return (
    <div className="app-shell">
      <ToastStack toasts={toasts} dismiss={dismissToast} />
      {!isAuthenticated ? (
        <div className="login-wrapper">
          <div className="login-card">
            <div className="text-center mb-4">
              <img
                src="https://cdn-icons-png.flaticon.com/512/2891/2891461.png"
                alt="MIPRES Logo"
                height="72"
              />
              <h2 className="mt-3">MIPRES</h2>
              <p className="text-muted">
                Sistema de Reporte de Facturas Electronicas
              </p>
            </div>
            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <label className="form-label">Usuario</label>
                <input
                  type="text"
                  className="form-control"
                  value={loginForm.username}
                  onChange={(event) =>
                    setLoginForm((prev) => ({
                      ...prev,
                      username: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="mb-4">
                <label className="form-label">Contrasena</label>
                <input
                  type="password"
                  className="form-control"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary w-100">
                <i className="fas fa-sign-in-alt me-2" />
                Iniciar Sesion
              </button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <nav className="navbar navbar-dark fixed-top">
            <div className="container-fluid">
              <span className="navbar-brand d-flex align-items-center">
                <img
                  src="https://cdn-icons-png.flaticon.com/512/2891/2891461.png"
                  alt="MIPRES Logo"
                />
                MIPRES
              </span>
              <button
                className="btn btn-outline-light"
                type="button"
                onClick={handleLogout}
              >
                <i className="fas fa-sign-out-alt me-2" />
                Cerrar sesion
              </button>
            </div>
          </nav>

          <main className="container main-container">
            <section className="mb-4">
              <h2 className="section-title">Panel de Control</h2>
              <div className="row g-3">
                <div className="col-12 col-md-3">
                  <StatCard
                    label="Total de envios"
                    value={stats.total}
                  />
                </div>
                <div className="col-12 col-md-3">
                  <StatCard
                    label="Envios de hoy"
                    value={stats.today}
                  />
                </div>
                <div className="col-12 col-md-3">
                  <StatCard label="Exitos" value={stats.success} />
                </div>
                <div className="col-12 col-md-3">
                  <StatCard label="Errores" value={stats.errors} />
                </div>
              </div>
            </section>
            <section className="mb-4">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title mb-3">Token Diario</h5>
                  <form
                    className="row g-3 align-items-end"
                    onSubmit={handleGenerateToken}
                  >
                    <div className="col-md-4">
                      <label className="form-label">NIT</label>
                      <input
                        type="text"
                        className="form-control"
                        value={tokenForm.nit}
                        onChange={(event) =>
                          setTokenForm((prev) => ({
                            ...prev,
                            nit: event.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Token Master</label>
                      <input
                        type="text"
                        className="form-control"
                        value={tokenForm.tokenMaster}
                        onChange={(event) =>
                          setTokenForm((prev) => ({
                            ...prev,
                            tokenMaster: event.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="col-md-4 text-md-end">
                      <button
                        type="submit"
                        className="btn btn-primary btn-icon"
                        disabled={loading.token}
                      >
                        <i className="fas fa-key me-2" />
                        Generar token
                        {loading.token && (
                          <span className="spinner-border spinner-border-sm ms-2" />
                        )}
                      </button>
                    </div>
                  </form>
                  <div className="token-info mt-3">
                    <div className="d-flex justify-content-between align-items-start flex-wrap">
                      <div>
                        <div className="token-label">Token actual</div>
                        <div className="token-value">
                          {mipresToken || '(sin token)'}
                        </div>
                      </div>
                      <div className="mt-3 mt-md-0 text-md-end">
                        <div className="token-label">Expira</div>
                        <div>{tokenExpiryLabel}</div>
                      </div>
                    </div>
                  </div>
                  <ResponsePanel
                    title="Generar token"
                    response={responses.token}
                  />
                </div>
              </div>
            </section>
            <section className="mb-4">
              <h3 className="section-title">Operaciones MIPRES</h3>
              <div className="card">
                <div className="card-header p-0">
                  <div className="nav nav-pills">
                    <button
                      className={`nav-link ${
                        activeTab === 'entrega' ? 'active' : ''
                      }`}
                      type="button"
                      onClick={() => setActiveTab('entrega')}
                    >
                      <i className="fas fa-box me-2" />
                      EntregaAmbito
                    </button>
                    <button
                      className={`nav-link ${
                        activeTab === 'reporte' ? 'active' : ''
                      }`}
                      type="button"
                      onClick={() => setActiveTab('reporte')}
                    >
                      <i className="fas fa-clipboard-list me-2" />
                      ReporteEntrega
                    </button>
                    <button
                      className={`nav-link ${
                        activeTab === 'facturacion' ? 'active' : ''
                      }`}
                      type="button"
                      onClick={() => setActiveTab('facturacion')}
                    >
                      <i className="fas fa-file-invoice me-2" />
                      Facturacion
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  {activeTab === 'entrega' && (
                    <>
                      <h5 className="mb-3">Formulario EntregaAmbito</h5>
                      <form
                        className="row g-3"
                        onSubmit={handleEntregaSubmit}
                      >
                        <div className="col-md-6">
                          <label className="form-label">
                            NumPrescripcion
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={entregaForm.NoPrescripcion}
                            onChange={(event) =>
                              handleEntregaFieldChange(
                                'NoPrescripcion',
                                event.target.value,
                              )
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">TipoTecnologia</label>
                          <select
                            className="form-select"
                            value={entregaForm.TipoTec}
                            onChange={(event) =>
                              handleEntregaFieldChange(
                                'TipoTec',
                                event.target.value,
                              )
                            }
                            required
                          >
                            <option value="" disabled>
                              Seleccione una opcion
                            </option>
                            {TIPO_TEC_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Consecutivo</label>
                          <input
                            type="text"
                            className="form-control"
                            value={DEFAULT_CONSECUTIVO}
                            readOnly
                            tabIndex={-1}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">
                            Tipo ID Paciente
                          </label>
                          <select
                            className="form-select"
                            value={entregaForm.TipoIDPaciente}
                            onChange={(event) =>
                              handleEntregaFieldChange(
                                'TipoIDPaciente',
                                event.target.value,
                              )
                            }
                            required
                          >
                            <option value="" disabled>
                              Seleccione un tipo
                            </option>
                            {TIPO_ID_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">
                            Numero ID Paciente
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={entregaForm.NoIDPaciente}
                            onChange={(event) =>
                              handleEntregaFieldChange(
                                'NoIDPaciente',
                                event.target.value,
                              )
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Numero Entrega</label>
                          <input
                            type="number"
                            className="form-control"
                            value={entregaForm.NoEntrega}
                            onChange={(event) =>
                              setEntregaForm((prev) => ({
                                ...prev,
                                NoEntrega: event.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">
                            Codigo Tecnologia
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={entregaForm.CodSerTecEntregado}
                            onChange={(event) =>
                              handleEntregaFieldChange(
                                'CodSerTecEntregado',
                                event.target.value,
                              )
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">
                            Cantidad Total Entregada
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={entregaForm.CantTotEntregada}
                            onChange={(event) =>
                              handleEntregaFieldChange(
                                'CantTotEntregada',
                                event.target.value,
                              )
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">EntTotal</label>
                          <input
                            type="number"
                            className="form-control"
                            value={entregaForm.EntTotal}
                            onChange={(event) =>
                              setEntregaForm((prev) => ({
                                ...prev,
                                EntTotal: event.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">
                            Causa No Entrega
                          </label>
                          <input
                            type="number"
                            className="form-control"
                            value={entregaForm.CausaNoEntrega}
                            onChange={(event) =>
                              setEntregaForm((prev) => ({
                                ...prev,
                                CausaNoEntrega: event.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Fecha Entrega</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder={DATE_PLACEHOLDER}
                            value={entregaForm.FecEntrega}
                            onChange={(event) =>
                              setEntregaForm((prev) => ({
                                ...prev,
                                FecEntrega: formatDateInputValue(
                                  event.target.value,
                                ),
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Numero Lote</label>
                          <input
                            type="text"
                            className="form-control"
                            value={entregaForm.NoLote}
                            onChange={(event) =>
                              setEntregaForm((prev) => ({
                                ...prev,
                                NoLote: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="col-12 text-end">
                          <button
                            type="submit"
                            className="btn btn-primary btn-icon"
                            disabled={loading.entrega}
                          >
                            <i className="fas fa-paper-plane me-2" />
                            Enviar
                            {loading.entrega && (
                              <span className="spinner-border spinner-border-sm ms-2" />
                            )}
                          </button>
                        </div>
                      </form>
                      <ResponsePanel
                        title="EntregaAmbito"
                        response={responses.entrega}
                      />
                    </>
                  )}
                  {activeTab === 'reporte' && (
                    <>
                      <h5 className="mb-3">Formulario ReporteEntrega</h5>
                      <form
                        className="row g-3"
                        onSubmit={handleReporteSubmit}
                      >
                        <div className="col-md-6">
                          <label className="form-label">ID Entrega</label>
                          <input
                            type="number"
                            className="form-control"
                            value={reporteForm.ID}
                            onChange={(event) =>
                              setReporteForm((prev) => ({
                                ...prev,
                                ID: event.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">
                            Estado de Entrega
                          </label>
                          <input
                            type="number"
                            className="form-control"
                            value={reporteForm.EstadoEntrega}
                            onChange={(event) =>
                              setReporteForm((prev) => ({
                                ...prev,
                                EstadoEntrega: event.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">
                            Causa No Entrega
                          </label>
                          <input
                            type="number"
                            className="form-control"
                            value={reporteForm.CausaNoEntrega}
                            onChange={(event) =>
                              setReporteForm((prev) => ({
                                ...prev,
                                CausaNoEntrega: event.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Valor Entregado</label>
                          <input
                            type="text"
                            className="form-control"
                            value={reporteForm.ValorEntregado}
                            onChange={(event) =>
                              handleReporteFieldChange(
                                'ValorEntregado',
                                event.target.value,
                              )
                            }
                            required
                          />
                        </div>
                        <div className="col-12 text-end">
                          <button
                            type="submit"
                            className="btn btn-primary btn-icon"
                            disabled={loading.reporte}
                          >
                            <i className="fas fa-paper-plane me-2" />
                            Enviar
                            {loading.reporte && (
                              <span className="spinner-border spinner-border-sm ms-2" />
                            )}
                          </button>
                        </div>
                      </form>
                      <ResponsePanel
                        title="ReporteEntrega"
                        response={responses.reporte}
                      />
                    </>
                  )}
                  {activeTab === 'facturacion' && (
                    <>
                      <h5 className="mb-3">Formulario Facturacion</h5>
                      <form
                        className="row g-3"
                        onSubmit={handleFacturacionSubmit}
                      >
                        <div className="col-md-6">
                          <label className="form-label">
                            NumPrescripcion
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={facturacionForm.NoPrescripcion}
                            onChange={(event) =>
                              handleFacturacionFieldChange(
                                'NoPrescripcion',
                                event.target.value,
                              )
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">TipoTecnologia</label>
                          <select
                            className="form-select"
                            value={facturacionForm.TipoTec}
                            onChange={(event) =>
                              handleFacturacionFieldChange(
                                'TipoTec',
                                event.target.value,
                              )
                            }
                            required
                          >
                            <option value="" disabled>
                              Seleccione una opcion
                            </option>
                            {TIPO_TEC_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Consecutivo</label>
                          <input
                            type="text"
                            className="form-control"
                            value={DEFAULT_CONSECUTIVO}
                            readOnly
                            tabIndex={-1}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">
                            Tipo ID Paciente
                          </label>
                          <select
                            className="form-select"
                            value={facturacionForm.TipoIDPaciente}
                            onChange={(event) =>
                              handleFacturacionFieldChange(
                                'TipoIDPaciente',
                                event.target.value,
                              )
                            }
                            required
                          >
                            <option value="" disabled>
                              Seleccione un tipo
                            </option>
                            {TIPO_ID_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">
                            Numero ID Paciente
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={facturacionForm.NoIDPaciente}
                            onChange={(event) =>
                              handleFacturacionFieldChange(
                                'NoIDPaciente',
                                event.target.value,
                              )
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Numero Entrega</label>
                          <input
                            type="number"
                            className="form-control"
                            value={facturacionForm.NoEntrega}
                            onChange={(event) =>
                              setFacturacionForm((prev) => ({
                                ...prev,
                                NoEntrega: event.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">
                            Numero SubEntrega
                          </label>
                          <input
                            type="number"
                            className="form-control"
                            value={facturacionForm.NoSubEntrega}
                            onChange={(event) =>
                              setFacturacionForm((prev) => ({
                                ...prev,
                                NoSubEntrega: event.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Numero Factura</label>
                          <input
                            type="text"
                            className="form-control"
                            value={facturacionForm.NoFactura}
                            onChange={(event) =>
                              setFacturacionForm((prev) => ({
                                ...prev,
                                NoFactura: event.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">EPS</label>
                          <select
                            className="form-select"
                            value={epsSelectValue}
                            onChange={(event) =>
                              handleEpsSelectChange(event.target.value)
                            }
                          >
                            <option value="">Seleccione EPS</option>
                            {EPS_OPTIONS.map((option) => (
                              <option key={option.id} value={option.id}>
                                {`${option.name} (${option.code})`}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Numero ID EPS</label>
                          <input
                            type="text"
                            className="form-control"
                            value={facturacionForm.NoIDEPS}
                            onChange={(event) =>
                              handleFacturacionFieldChange(
                                'NoIDEPS',
                                event.target.value,
                              )
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Codigo EPS</label>
                          <input
                            type="text"
                            className="form-control"
                            value={facturacionForm.CodEPS}
                            onChange={(event) =>
                              setFacturacionForm((prev) => ({
                                ...prev,
                                CodEPS: event.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">
                            Codigo Tecnologia Entregada
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={facturacionForm.CodSerTecAEntregado}
                            onChange={(event) =>
                              handleFacturacionFieldChange(
                                'CodSerTecAEntregado',
                                event.target.value,
                              )
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">
                            Cantidad Unidad
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={facturacionForm.CantUnMinDis}
                            onChange={(event) =>
                              handleFacturacionFieldChange(
                                'CantUnMinDis',
                                event.target.value,
                              )
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">
                            Valor Unitario Facturado
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={facturacionForm.ValorUnitFacturado}
                            onChange={(event) =>
                              setFacturacionForm((prev) => ({
                                ...prev,
                                ValorUnitFacturado: event.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">
                            Valor Total Facturado
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={facturacionForm.ValorTotFacturado}
                            onChange={(event) =>
                              handleFacturacionFieldChange(
                                'ValorTotFacturado',
                                event.target.value,
                              )
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Cuota Moderadora</label>
                          <input
                            type="text"
                            className="form-control"
                            value="0"
                            readOnly
                            tabIndex={-1}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Copago</label>
                          <input
                            type="text"
                            className="form-control"
                            value="0"
                            readOnly
                            tabIndex={-1}
                          />
                        </div>
                        <div className="col-12 text-end">
                          <button
                            type="submit"
                            className="btn btn-primary btn-icon"
                            disabled={loading.facturacion}
                          >
                            <i className="fas fa-paper-plane me-2" />
                            Enviar
                            {loading.facturacion && (
                              <span className="spinner-border spinner-border-sm ms-2" />
                            )}
                          </button>
                        </div>
                      </form>
                      <ResponsePanel
                        title="Facturacion"
                        response={responses.facturacion}
                      />
                    </>
                  )}
                </div>
              </div>
            </section>
            <section className="mb-5">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between">
                    <div>
                      <h5 className="card-title mb-1">Reporte Local</h5>
                      <p className="text-muted mb-0">
                        Exporta los envios registrados durante el dia en formato JSON.
                      </p>
                    </div>
                    <div className="form-check form-switch mt-3 mt-md-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="includeSuccess"
                        checked={includeSuccess}
                        onChange={(event) => setIncludeSuccess(event.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="includeSuccess">
                        Incluir registros exitosos
                      </label>
                    </div>
                  </div>
                  <div className="text-end mt-3">
                    <button
                      type="button"
                      className="btn btn-outline-light"
                      onClick={handleDownloadReport}
                    >
                      <i className="fas fa-download me-2" />
                      Descargar reporte diario
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </>
      )}
    </div>
  );
}

export default App;
