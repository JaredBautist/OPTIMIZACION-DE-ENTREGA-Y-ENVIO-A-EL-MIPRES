
import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api';

const defaultEntregaForm = {
  NoPrescripcion: '',
  TipoTec: '',
  ConTec: '',
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
  ConTec: '',
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
  CuotaModer: '',
  Copago: '',
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
  const [tokenForm, setTokenForm] = useState({ nit: '', tokenMaster: '' });
  const [entregaForm, setEntregaForm] = useState(defaultEntregaForm);
  const [reporteForm, setReporteForm] = useState(defaultReporteForm);
  const [facturacionForm, setFacturacionForm] = useState(
    defaultFacturacionForm,
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
      setSubmissions(storedSubs);
    }
    if (storedEntregaId) {
      const parsed = Number(storedEntregaId);
      if (!Number.isNaN(parsed)) {
        setLastEntregaId(parsed);
      }
    }
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

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setJwt(null);
    setMipresToken(null);
    setTokenExpiry(null);
    setResponses({
      token: null,
      entrega: null,
      reporte: null,
      facturacion: null,
    });
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

  const addSubmission = useCallback((type, requestBody, response, status) => {
    const entry = {
      id: Date.now(),
      type,
      request: requestBody,
      response,
      status,
      timestamp: new Date().toISOString(),
    };
    setSubmissions((prev) => [...prev, entry]);
  }, []);
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

    setLoading((prev) => ({ ...prev, token: true }));

    const { ok, status, data } = await apiRequest('/mipres/token', {
      method: 'POST',
      body: {
        nit: tokenForm.nit.trim(),
        token: tokenForm.tokenMaster.trim(),
      },
    });

    setLoading((prev) => ({ ...prev, token: false }));
    setResponses((prev) => ({
      ...prev,
      token: { ok, status, data },
    }));

    const raw = data?.data;
    const extracted =
      typeof raw === 'string' ? raw : raw?.Token ?? raw?.token ?? null;

    if (ok && extracted) {
      setMipresToken(extracted);
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      setTokenExpiry(expiry);
      addToast('Token diario generado correctamente');
      setTokenForm({ nit: '', tokenMaster: '' });
    } else {
      addToast(data?.message || 'No se pudo generar token', 'danger');
    }
  };
  const handleEntregaSubmit = async (event) => {
    event.preventDefault();
    if (!mipresToken) {
      addToast('Debe generar un token primero', 'danger');
      return;
    }

    const body = {
      mipresToken,
      ambito: true,
      NoPrescripcion: entregaForm.NoPrescripcion.trim(),
      TipoTec: entregaForm.TipoTec.trim(),
      ConTec: Number(entregaForm.ConTec || 0),
      TipoIDPaciente: entregaForm.TipoIDPaciente.trim(),
      NoIDPaciente: entregaForm.NoIDPaciente.trim(),
      NoEntrega: Number(entregaForm.NoEntrega || 0),
      CodSerTecEntregado: entregaForm.CodSerTecEntregado.trim(),
      CantTotEntregada: entregaForm.CantTotEntregada.trim(),
      EntTotal: Number(entregaForm.EntTotal || 0),
      CausaNoEntrega: Number(entregaForm.CausaNoEntrega || 0),
      FecEntrega: entregaForm.FecEntrega,
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

    if (ok) {
      const id = data?.data?.ID ?? Date.now();
      setLastEntregaId(id);
      addSubmission('EntregaAmbito', body, data, status);
      addToast(`Entrega registrada correctamente. ID: ${id}`);
    } else {
      addToast(data?.message || 'Error registrando entrega', 'danger');
    }
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

    if (ok) {
      addSubmission('ReporteEntrega', body, data, status);
      addToast('Reporte de entrega registrado correctamente');
    } else {
      addToast(data?.message || 'Error registrando reporte', 'danger');
    }
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
      ConTec: Number(facturacionForm.ConTec || 0),
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
      CuotaModer: facturacionForm.CuotaModer.trim(),
      Copago: facturacionForm.Copago.trim(),
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

    if (ok) {
      addSubmission('Facturacion', body, data, status);
      addToast('Facturacion registrada correctamente');
    } else {
      addToast(data?.message || 'Error registrando facturacion', 'danger');
    }
  };

  const handleDownloadReport = () => {
    const today = new Date().toDateString();
    let todaySubs = submissions.filter(
      (entry) => new Date(entry.timestamp).toDateString() === today,
    );

    if (!includeSuccess) {
      todaySubs = todaySubs.filter(
        (entry) => entry.status < 200 || entry.status >= 300,
      );
    }

    if (!todaySubs.length) {
      addToast('No hay registros para generar el reporte', 'warning');
      return;
    }

    const payload = JSON.stringify(todaySubs, null, 2);
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
    const total = submissions.length;
    const today = new Date().toDateString();
    const todayCount = submissions.filter(
      (entry) => new Date(entry.timestamp).toDateString() === today,
    ).length;
    const success = submissions.filter(
      (entry) => entry.status >= 200 && entry.status < 300,
    ).length;
    const errors = total - success;

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
                              setEntregaForm((prev) => ({
                                ...prev,
                                NoPrescripcion: event.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">TipoTecnologia</label>
                          <input
                            type="text"
                            className="form-control"
                            value={entregaForm.TipoTec}
                            onChange={(event) =>
                              setEntregaForm((prev) => ({
                                ...prev,
                                TipoTec: event.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Contec</label>
                          <input
                            type="number"
                            className="form-control"
                            value={entregaForm.ConTec}
                            onChange={(event) =>
                              setEntregaForm((prev) => ({
                                ...prev,
                                ConTec: event.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">
                            Tipo ID Paciente
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={entregaForm.TipoIDPaciente}
                            onChange={(event) =>
                              setEntregaForm((prev) => ({
                                ...prev,
                                TipoIDPaciente: event.target.value,
                              }))
                            }
                            required
                          />
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
                              setEntregaForm((prev) => ({
                                ...prev,
                                NoIDPaciente: event.target.value,
                              }))
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
                              setEntregaForm((prev) => ({
                                ...prev,
                                CodSerTecEntregado: event.target.value,
                              }))
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
                              setEntregaForm((prev) => ({
                                ...prev,
                                CantTotEntregada: event.target.value,
                              }))
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
                            type="date"
                            className="form-control"
                            value={entregaForm.FecEntrega}
                            onChange={(event) =>
                              setEntregaForm((prev) => ({
                                ...prev,
                                FecEntrega: event.target.value,
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
                              setReporteForm((prev) => ({
                                ...prev,
                                ValorEntregado: event.target.value,
                              }))
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
                              setFacturacionForm((prev) => ({
                                ...prev,
                                NoPrescripcion: event.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">TipoTecnologia</label>
                          <input
                            type="text"
                            className="form-control"
                            value={facturacionForm.TipoTec}
                            onChange={(event) =>
                              setFacturacionForm((prev) => ({
                                ...prev,
                                TipoTec: event.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Consecutivo</label>
                          <input
                            type="number"
                            className="form-control"
                            value={facturacionForm.ConTec}
                            onChange={(event) =>
                              setFacturacionForm((prev) => ({
                                ...prev,
                                ConTec: event.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">
                            Tipo ID Paciente
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={facturacionForm.TipoIDPaciente}
                            onChange={(event) =>
                              setFacturacionForm((prev) => ({
                                ...prev,
                                TipoIDPaciente: event.target.value,
                              }))
                            }
                            required
                          />
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
                              setFacturacionForm((prev) => ({
                                ...prev,
                                NoIDPaciente: event.target.value,
                              }))
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
                          <label className="form-label">Numero ID EPS</label>
                          <input
                            type="text"
                            className="form-control"
                            value={facturacionForm.NoIDEPS}
                            onChange={(event) =>
                              setFacturacionForm((prev) => ({
                                ...prev,
                                NoIDEPS: event.target.value,
                              }))
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
                              setFacturacionForm((prev) => ({
                                ...prev,
                                CodSerTecAEntregado: event.target.value,
                              }))
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
                              setFacturacionForm((prev) => ({
                                ...prev,
                                CantUnMinDis: event.target.value,
                              }))
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
                              setFacturacionForm((prev) => ({
                                ...prev,
                                ValorTotFacturado: event.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Cuota Moderadora</label>
                          <input
                            type="text"
                            className="form-control"
                            value={facturacionForm.CuotaModer}
                            onChange={(event) =>
                              setFacturacionForm((prev) => ({
                                ...prev,
                                CuotaModer: event.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Copago</label>
                          <input
                            type="text"
                            className="form-control"
                            value={facturacionForm.Copago}
                            onChange={(event) =>
                              setFacturacionForm((prev) => ({
                                ...prev,
                                Copago: event.target.value,
                              }))
                            }
                            required
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
