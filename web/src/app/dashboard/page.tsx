import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '../../prisma/db';
import { createTenantAction } from '../actions';

export const metadata: Metadata = {
  title: 'Dashboard - Kuopas',
};

export default async function DashboardPage() {
  const buildings = await db.orm.public.Building.include('stairwells', (stairwells) =>
    stairwells.include('units', (units) => units.orderBy((u) => u.code.asc())),
  ).all();

  const tenants = await db.orm.public.Tenant.include('unit', (unit) =>
    unit.include('stairwell', (stairwell) => stairwell.include('building', (b) => b)),
  )
    .include('memberships', (memberships) => memberships.include('chatGroup', (g) => g))
    .orderBy((t) => t.name.asc())
    .all();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-12">
      <header>
        <h1 className="text-2xl font-semibold">Building chat</h1>
        <p className="text-zinc-500">Tenants and their auto-assigned building / stairwell / floor groups.</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Tenants</h2>
        {tenants.length === 0 && <p className="text-zinc-500">No tenants yet.</p>}
        <ul className="flex flex-col gap-4">
          {tenants.map((tenant) => {
            const unit = tenant.unit!;
            const stairwell = unit.stairwell!;
            const building = stairwell.building!;
            return (
            <li key={tenant.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="font-medium">
                {tenant.name}{' '}
                <span className="font-normal text-zinc-500">
                  ({building.name} {stairwell.label}
                  {unit.code})
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {tenant.memberships.map((m) => (
                  <Link
                    key={m.id}
                    href={`/chat/${m.chatGroup!.id}`}
                    className="rounded-full border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    {m.chatGroup!.name}
                  </Link>
                ))}
              </div>
            </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Add a tenant</h2>
        <form action={createTenantAction} className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <input
            name="name"
            placeholder="Full name"
            required
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <select
            name="unitId"
            required
            defaultValue=""
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="" disabled>
              Select a unit
            </option>
            {buildings.map((building) =>
              building.stairwells.map((stairwell) =>
                stairwell.units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {building.name}, {stairwell.label}
                    {unit.code} (floor {unit.floor})
                  </option>
                )),
              ),
            )}
          </select>
          <button
            type="submit"
            className="self-start rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
          >
            Add tenant
          </button>
        </form>
      </section>
    </div>
  );
}
