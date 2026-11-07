
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const MAX_SIZE = 5 * 1024 * 1024;

const TIPOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export async function uploadLogoCloudinary(file, uid) {
  if (!file) return null;

  if (typeof uid !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(uid)) {
    throw new Error("Não foi possível identificar a conta da loja.");
  }

  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    throw new Error("Escolha uma imagem JPG, PNG ou WEBP.");
  }

  if (file.size > MAX_SIZE) {
    throw new Error("A imagem não pode ultrapassar 5 MB.");
  }

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Configuração do Cloudinary em falta. Verifique o ficheiro .env."
    );
  }

  if (!/^[a-z0-9-]+$/.test(CLOUD_NAME)) {
    throw new Error("O nome da conta Cloudinary não é válido.");
  }

  const dados = new FormData();

  dados.append("file", file);
  dados.append("upload_preset", UPLOAD_PRESET);
  dados.append("folder", `mercado_fresko/lojas/${uid}`);

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 30_000);

  try {
    const resposta = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: dados,
        signal: controlador.signal,
      }
    );
    let resultado;

    try {
      resultado = await resposta.json();
    } catch {
      throw new Error("O serviço de imagens devolveu uma resposta inválida.");
    }

    if (!resposta.ok) {
      throw new Error(
        resultado.error?.message || "Não foi possível carregar o logótipo."
      );
    }

    if (
      typeof resultado.secure_url !== "string" ||
      !resultado.secure_url.startsWith(
        `https://res.cloudinary.com/${CLOUD_NAME}/`
      ) ||
      typeof resultado.public_id !== "string"
    ) {
      throw new Error("O serviço não confirmou o carregamento do logótipo.");
    }

    return {
      url: resultado.secure_url,
      publicId: resultado.public_id,
    };
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("O carregamento demorou demasiado. Tente novamente.");
    }
    throw error;
  } finally {
    clearTimeout(temporizador);
  }
}
