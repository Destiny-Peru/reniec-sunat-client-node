# @destiny-peru/reniec-sunat-client

Cliente TypeScript para consumir el microservicio `reniec-sunat` desde Node.js.
Incluye tipos, validacion de DNI/RUC, timeout, cancelacion y errores de API
estructurados. No requiere dependencias en tiempo de ejecucion.

## Requisitos

- Node.js 20 o superior
- TypeScript 5 o superior si el proyecto consumidor usa TypeScript

## Instalacion

El paquete se distribuye mediante GitHub Packages. Agrega este archivo
`.npmrc` en la raiz del proyecto consumidor:

```ini
@destiny-peru:registry=https://npm.pkg.github.com
```

Para instalarlo localmente necesitas un Personal Access Token classic con
permiso `read:packages`. Configura el token como variable de entorno, sin
guardarlo en el repositorio:

```powershell
$env:NODE_AUTH_TOKEN = "github_pat_o_ghp_aqui"
npm config set //npm.pkg.github.com/:_authToken $env:NODE_AUTH_TOKEN
```

En Linux o macOS:

```bash
export NODE_AUTH_TOKEN="github_pat_o_ghp_aqui"
npm config set //npm.pkg.github.com/:_authToken "$NODE_AUTH_TOKEN"
```

Luego instala normalmente:

```bash
npm install @destiny-peru/reniec-sunat-client
```

En GitHub Actions se puede utilizar `GITHUB_TOKEN` si el repositorio consumidor
tiene acceso de lectura al paquete:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: 24
    registry-url: https://npm.pkg.github.com
    scope: "@destiny-peru"

- run: npm ci
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Uso rapido

```ts
import {
  ReniecSunatApiError,
  createReniecSunatClient
} from "@destiny-peru/reniec-sunat-client";

const client = createReniecSunatClient({
  timeoutMs: 15_000
});

const health = await client.health();
const person = await client.getPersonByDni("71101328");
const company = await client.getCompanyByRuc("20604633070");

console.log(health.status);
console.log(person.firstNames, person.lastNames);
console.log(company.businessName);

try {
  await client.getCompanyByRuc("20114052311");
} catch (error) {
  if (error instanceof ReniecSunatApiError) {
    console.error(error.statusCode, error.code, error.requestId);
  }
}
```

La URL de produccion ya esta configurada por defecto:

```text
https://api-reniec-sunat.destiny-peru.com
```

Para desarrollo local u otro ambiente:

```ts
const client = createReniecSunatClient({
  baseUrl: "http://localhost:8080",
  headers: {
    "X-Request-ID": "demo-123"
  }
});
```

Si el servicio incorpora autenticacion:

```ts
const client = createReniecSunatClient({
  bearerToken: process.env.RENIEC_SUNAT_TOKEN
});
```

## Metodos

```ts
client.health(options?)
client.getPersonByDni(dni, options?)
client.getCompanyByRuc(ruc, options?)
client.getTodayExchangeRate(options?)
client.getExchangeRateByDate("2026-07-28", options?)
client.getExchangeRatesByMonth(2026, 7, options?)
```

Cada metodo acepta un `AbortSignal` y headers adicionales:

```ts
const controller = new AbortController();

const person = await client.getPersonByDni("71101328", {
  signal: controller.signal,
  headers: {
    "X-Request-ID": crypto.randomUUID()
  }
});
```

## Errores

- `ReniecSunatValidationError`: DNI, RUC, fecha o periodo invalido.
- `ReniecSunatApiError`: la API respondio con HTTP 4xx o 5xx.
- `ReniecSunatTimeoutError`: se alcanzo el timeout configurado.
- `ReniecSunatNetworkError`: no fue posible conectar con la API.

`ReniecSunatApiError` expone `statusCode`, `code`, `requestId`, `path`,
`details` y los helpers `isBadRequest`, `isNotFound`, `isUnauthorized`,
`isBadGateway` e `isServiceUnavailable`.

## Fechas

El cliente mantiene las fechas como cadenas ISO para evitar cambios silenciosos
por zona horaria. Las fechas de negocio usan `YYYY-MM-DD` y los timestamps
mantienen el formato enviado por la API.

## Desarrollo

```bash
npm install
npm run check
npm test
npm run build
```

Para verificar el contenido que se publicara:

```bash
npm pack --dry-run
```

## Publicacion

El proyecto usa Release Please y Conventional Commits para administrar las
versiones automaticamente:

1. Un `feat:` genera una version minor.
2. Un `fix:` genera una version patch.
3. Un `feat!:` o `BREAKING CHANGE:` genera una version major.
4. Release Please crea o actualiza el PR de release.
5. Al fusionar el PR, se crea el tag `vX.Y.Z` y el GitHub Release.
6. El paquete de esa version se prueba, compila y publica en GitHub Packages.

La primera version publica sera `1.0.0`. El workflow de Release Please parte
del manifest `0.0.0` para crear ese release inicial. Despues, el manifest,
`package.json`, `package-lock.json` y `CHANGELOG.md` se actualizan mediante el
PR de release.

El workflow `.github/workflows/publish-package.yml` tambien puede ejecutarse
manualmente desde `Actions > Publish npm package > Run workflow` como mecanismo
de recuperacion. Un registro npm no permite reemplazar una version que ya fue
publicada.
