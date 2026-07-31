// frontend/src/components/shared/ImageUpload.jsx
// Componente reutilizável de upload de imagem

import { useState, useRef } from "react";
import api, { API_ORIGIN } from "../../services/api";

const C = { primary:"#F7931E", white:"#fff", gray:"#F4F4F4", grayMid:"#E0E0E0", textGray:"#999", red:"#F44336", green:"#10B981" };

/**
 * @param {object} props
 * @param {string}   props.value      - URL atual da imagem
 * @param {Function} props.onChange   - Callback(url) quando upload concluir
 * @param {string}   props.label      - Rótulo do campo
 * @param {string}   props.placeholder- Emoji ou texto de placeholder
 */
export default function ImageUpload({ value, onChange, label = "Imagem", placeholder = "🖼️" }) {
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [preview,  setPreview]  = useState(value || "");
  const inputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview local imediato
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);

    setLoading(true);
    setError("");

    try {
      const form = new FormData();
      form.append("file", file);

      const { data } = await api.post("/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setPreview(data.url);
      onChange?.(data.url);
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao fazer upload");
      setPreview(value || ""); // Reverte preview
    } finally {
      setLoading(false);
      e.target.value = ""; // Reset input para permitir re-upload do mesmo arquivo
    }
  };

  const clear = () => {
    setPreview("");
    onChange?.("");
  };

  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label style={{ fontSize: 12, color: C.textGray, fontWeight: 700, display: "block", marginBottom: 6 }}>
          {label}
        </label>
      )}

      <div
        onClick={() => !loading && inputRef.current?.click()}
        style={{
          width: "100%", minHeight: 120, borderRadius: 12,
          border: `2px dashed ${loading ? C.primary : preview ? C.primary : C.grayMid}`,
          background: preview ? "transparent" : C.gray,
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", cursor: loading ? "wait" : "pointer",
          overflow: "hidden", position: "relative", transition: "border-color .2s",
        }}
      >
        {preview ? (
          <>
            <img
              src={preview.startsWith("/uploads") ? `${API_ORIGIN}${preview}` : preview}
              alt="Preview"
              style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }}
              onError={() => setPreview("")}
            />
            {/* Overlay de troca */}
            <div style={{
              position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
              display: "flex", gap: 12, alignItems: "center", justifyContent: "center",
              opacity: 0, transition: "opacity .2s",
            }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
              onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
            >
              <button
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                style={{ background: C.white, border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                ✏️ Trocar
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); clear(); }}
                style={{ background: "#FEE2E2", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 700, fontSize: 13, color: C.red }}>
                🗑️ Remover
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: 16, color: C.textGray }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>{loading ? "⏳" : placeholder}</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{loading ? "Enviando..." : "Clique para enviar"}</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>JPEG, PNG, WebP — máx. 5MB</div>
          </div>
        )}

        {loading && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(255,255,255,0.8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: C.primary,
          }}>
            Enviando... ⏳
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFile}
        style={{ display: "none" }}
      />

      {error && (
        <div style={{ color: C.red, fontSize: 12, marginTop: 6, fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
