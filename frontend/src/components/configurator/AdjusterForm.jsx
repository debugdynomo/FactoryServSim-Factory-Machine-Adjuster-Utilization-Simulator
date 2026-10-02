import React, { useState } from 'react';
import { Wrench, User, UserPlus, X } from 'lucide-react';

export default function AdjusterForm({
  adjusters,
  categories,
  onChange,
}) {
  const [name, setName] = useState('');
  const [expertise, setExpertise] = useState([]);
  const [error, setError] = useState('');

  const toggleExpertise = (category) => {
    setExpertise((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  };

  const reset = () => {
    setName('');
    setExpertise([]);
    setError('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!name.trim()) {
      setError('Adjuster name is required.');
      return;
    }

    if (expertise.length === 0) {
      setError('Select at least one expertise category.');
      return;
    }

    const nextId =
      adjusters.length > 0
        ? Math.max(...adjusters.map((adjuster) => Number(adjuster.id))) + 1
        : 1;

    onChange([
      ...adjusters,
      {
        id: nextId,
        name: name.trim(),
        expertise,
      },
    ]);

    reset();
  };

  const removeAdjuster = (id) => {
    onChange(adjusters.filter((adjuster) => adjuster.id !== id));
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
      <div className="mb-6 flex items-start gap-3 border-b border-slate-100 pb-4">
        <div className="mt-1 rounded-md bg-slate-100 p-2 text-slate-700">
          <Wrench className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Adjusters</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Add repair staff and assign the machine categories they can service.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg bg-slate-50 p-5 border border-slate-200 space-y-5">
        <div className="max-w-md">
          <label
            htmlFor="adjuster-name"
            className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700"
          >
            <User className="h-4 w-4 text-slate-400" />
            Adjuster name
          </label>
          <input
            id="adjuster-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError('');
            }}
            placeholder="e.g. Adjuster 1"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-slate-700 flex items-center gap-1.5">
            <Wrench className="h-4 w-4 text-slate-400" />
            Expertise
          </legend>

          {categories.length === 0 ? (
            <div className="rounded-lg bg-amber-50 p-4 border border-amber-200 text-sm font-medium text-amber-800">
              Add at least one machine category before assigning expertise.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {categories.map((category) => {
                const isSelected = expertise.includes(category.name);
                return (
                  <label
                    key={category.name}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      isSelected 
                        ? 'border-slate-900 bg-slate-900 text-white' 
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleExpertise(category.name)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <span className="text-sm font-semibold">
                      {category.name}
                    </span>
                  </label>
                )
              })}
            </div>
          )}
        </fieldset>

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={categories.length === 0}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" /> Add Adjuster
        </button>
      </form>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {adjusters.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            <User className="mb-2 h-8 w-8 text-slate-400" />
            <p className="font-medium">No adjusters configured yet.</p>
          </div>
        ) : (
          adjusters.map((adjuster) => (
            <div
              key={adjuster.id}
              className="group relative flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                    <User className="h-5 w-5" />
                  </div>
                  <p className="font-bold text-slate-900">{adjuster.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAdjuster(adjuster.id)}
                  className="rounded-full p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none"
                  aria-label="Remove adjuster"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Expertise</p>
                <div className="flex flex-wrap gap-2">
                  {adjuster.expertise.map((item) => (
                    <span
                      key={item}
                      className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}