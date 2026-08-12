/** DUENO: Isa (modulo A). TODO: formulario de registro + indicador de fuerza de contrasena. */
export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-sm rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-semibold">Crear cuenta</h1>
      <p className="mt-2 text-sm text-slate-500">
        Pendiente: POST /auth/register. Recuerda que la contrasena requiere 12 caracteres minimo
        y que el rol lo asigna el servidor (nunca se envia desde el formulario).
      </p>
    </div>
  );
}
