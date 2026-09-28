import React, { useState } from 'react';

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
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">Adjusters</h2>
        <p className="mt-1 text-sm text-slate-500">
          Add repair staff and assign the machine categories they can service.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="adjuster-name"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
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
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">
            Expertise
          </legend>

          {categories.length === 0 ? (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
              Add at least one machine category before assigning expertise.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <label
                  key={category.name}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={expertise.includes(category.name)}
                    onChange={() => toggleExpertise(category.name)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">
                    {category.name}
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={categories.length === 0}
          className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add Adjuster
        </button>
      </form>

      <div className="mt-6 space-y-3">
        {adjusters.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            No adjusters configured yet.
          </div>
        ) : (
          adjusters.map((adjuster) => (
            <div
              key={adjuster.id}
              className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-slate-900">{adjuster.name}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {adjuster.expertise.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeAdjuster(adjuster.id)}
                className="self-start text-sm font-medium text-red-600 hover:text-red-800 sm:self-auto"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}