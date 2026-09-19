

`frontend/src/pages/Login.jsx`


import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const C = {
  primary: "#F7931E",
  primaryDark: "#F15A24",
  white: "#FFFFFF",
  gray: "#F4F4F4",
  grayMid: "#E0E0E0",
  textGray: "#999999",
  textDark: "#333333",
  red: "#F44336",
};

const redirectByRole = {
  admin: "/admin",
  store_owner: "/store",
  customer: "/app",
};

export default function LoginPage() {
  const { login, register } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || null;

  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("customer");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  const setField = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      let user;

      if (mode === "login") {
        user = await login(form.email, form.password);
      } else {
        if (!acceptPrivacy || !acceptTerms) {
          setError("Para criar a conta, aceite a Política de Privacidade e os Termos de Uso.");
          return;
        }

        user = await register({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          role,
          acceptPrivacy: true,
          acceptTerms: true,
          marketingConsent,
        });
      }

      const destination =
        from || redirectByRole[user.role] || "/app";

      navigate(destination, { replace: true });
    } catch (err) {
      console.error("Erro de autenticação:", err);

      const message =
        err?.response?.data?.error ||
        err?.message ||
        "Erro ao autenticar.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    borderRadius: 12,
    border: "2px solid #E0E0E0",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #F7931E, #F15A24)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: C.white,
          borderRadius: 24,
          padding: 36,
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 24px 60px rgba(0,0,0,0.2)",
        }}
      >
        {/* Logo */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 28,
          }}
        >
          <div
            style={{
              fontSize: 52,
              marginBottom: 8,
            }}
          >
            🐾
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: C.primary,
            }}
          >
            Pet
            <span style={{ color: C.primaryDark }}>
              Delivery
            </span>
          </div>

          <div
            style={{
              fontSize: 13,
              color: C.textGray,
              marginTop: 4,
            }}
          >
            {mode === "login"
              ? "Acesse sua conta"
              : "Crie sua conta"}
          </div>
        </div>

        {/* Abas */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 20,
            background: C.gray,
            borderRadius: 12,
            padding: 4,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            style={{
              flex: 1,
              padding: 10,
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 700,
              fontSize: 13,
              background:
                mode === "login" ? C.white : "transparent",
              color:
                mode === "login"
                  ? C.primary
                  : C.textGray,
            }}
          >
            Entrar
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
            }}
            style={{
              flex: 1,
              padding: 10,
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 700,
              fontSize: 13,
              background:
                mode === "register"
                  ? C.white
                  : "transparent",
              color:
                mode === "register"
                  ? C.primary
                  : C.textGray,
            }}
          >
            Cadastrar
          </button>
        </div>

        {/* Tipo de conta */}
        {mode === "register" && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: C.textGray,
                marginBottom: 8,
              }}
            >
              Tipo de conta
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={() => setRole("customer")}
                style={{
                  padding: "12px 10px",
                  border:
                    role === "customer"
                      ? "2px solid #F7931E"
                      : "2px solid #E0E0E0",
                  borderRadius: 12,
                  background:
                    role === "customer"
                      ? "#FFF1E4"
                      : C.white,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 13,
                    color:
                      role === "customer"
                        ? C.primary
                        : C.textDark,
                  }}
                >
                  Cliente 👤
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: C.textGray,
                    marginTop: 3,
                  }}
                >
                  Comprar produtos
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole("store_owner")}
                style={{
                  padding: "12px 10px",
                  border:
                    role === "store_owner"
                      ? "2px solid #F7931E"
                      : "2px solid #E0E0E0",
                  borderRadius: 12,
                  background:
                    role === "store_owner"
                      ? "#FFF1E4"
                      : C.white,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 13,
                    color:
                      role === "store_owner"
                        ? C.primary
                        : C.textDark,
                  }}
                >
                  Lojista 🏪
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: C.textGray,
                    marginTop: 3,
                  }}
                >
                  Vender produtos
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Formulário */}
        <form
          onSubmit={submit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {mode === "register" && (
            <input
              value={form.name}
              onChange={setField("name")}
              placeholder="Nome completo"
              required
              autoComplete="name"
              style={inputStyle}
              onFocus={(event) => {
                event.target.style.borderColor =
                  C.primary;
              }}
              onBlur={(event) => {
                event.target.style.borderColor =
                  C.grayMid;
              }}
            />
          )}

          <input
            type="email"
            value={form.email}
            onChange={setField("email")}
            placeholder="E-mail"
            required
            autoComplete="email"
            style={inputStyle}
            onFocus={(event) => {
              event.target.style.borderColor = C.primary;
            }}
            onBlur={(event) => {
              event.target.style.borderColor = C.grayMid;
            }}
          />

          <input
            type="password"
            value={form.password}
            onChange={setField("password")}
            placeholder="Senha"
            required
            autoComplete={
              mode === "login"
                ? "current-password"
                : "new-password"
            }
            style={inputStyle}
            onFocus={(event) => {
              event.target.style.borderColor = C.primary;
            }}
            onBlur={(event) => {
              event.target.style.borderColor = C.grayMid;
            }}
          />

          {mode === "register" && (
            <input
              value={form.phone}
              onChange={setField("phone")}
              placeholder="Telefone (opcional)"
              autoComplete="tel"
              style={inputStyle}
              onFocus={(event) => {
                event.target.style.borderColor =
                  C.primary;
              }}
              onBlur={(event) => {
                event.target.style.borderColor =
                  C.grayMid;
              }}
            />
          )}

          {mode === "register" && (
            <div style={{ fontSize: 12, color: "#555", display: "grid", gap: 8, marginTop: 2 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer" }}>
                <input type="checkbox" checked={acceptPrivacy} onChange={(e) => setAcceptPrivacy(e.target.checked)} />
                <span>Li e aceito a <a href="/privacidade" target="_blank" rel="noreferrer">Política de Privacidade</a>.</span>
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer" }}>
                <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
                <span>Li e aceito os <a href="/termos" target="_blank" rel="noreferrer">Termos de Uso</a>.</span>
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer" }}>
                <input type="checkbox" checked={marketingConsent} onChange={(e) => setMarketingConsent(e.target.checked)} />
                <span>Quero receber novidades e ofertas. <b>(opcional)</b></span>
              </label>
            </div>
          )}

          {error && (
            <div
              style={{
                background: "#FFF0F0",
                color: C.red,
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background:
                "linear-gradient(135deg, #F7931E, #F15A24)",
              color: C.white,
              border: "none",
              borderRadius: 12,
              padding: 14,
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.8 : 1,
              fontFamily: "inherit",
              marginTop: 4,
            }}
          >
            {loading
              ? "Aguarde..."
              : mode === "login"
              ? "Entrar"
              : "Criar conta"}
          </button>
        </form>
      </div>
    </div>
  );
}



