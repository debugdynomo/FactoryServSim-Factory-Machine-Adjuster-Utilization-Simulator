import React, { useState } from 'react';

const EMPTY_CATEGORY = {
  name: '',
  count: 0,
  mttf: 2000,
  mean_repair_time: 5,
};

export default function CategoryForm({ categories, onChange }) {
  const [form, setForm] = useState(EMPTY_CATEGORY);
  const [editingIndex, setEditingIndex] = useState(null);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = 'Category name is required.';
    }

    if (!Number.isInteger(Number(form.count)) || Number(form.count) < 0) {
      nextErrors.count = 'Count must be a non-negative integer.';
    }

    if (!Number.isFinite(Number(form.mttf)) || Number(form.mttf) <= 0) {
      nextErrors.mttf = 'MTTF must be greater than 0.';
    }

    if (
      !Number.isFinite(Number(form.mean_repair_time)) ||
      Number(form.mean_repair_time) <= 0
    ) {
      nextErrors.mean_repair_time =
        'Repair time must be greater than 0.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    const category = {
      name: form.name.trim(),
      count: Number(form.count),
      mttf: Number(form.mttf),
      mean_repair_time: Number(form.mean_repair_time),
    };

    if (editingIndex === null) {
      onChange([...categories, category]);
    } else {
      onChange(
        categories.map((item, index) =>
          index === editingIndex ? category : item
        )
      );
    }

    setForm(EMPTY_CATEGORY);
    setEditingIndex(null);
    setErrors({});
  };

  const handleEdit = (index) => {
    setForm({
      name: categories[index].name,
      count: categories[index].count,
      mttf: categories[index].mttf,
      mean_repair_time: categories[index].mean_repair_time,
    });

    setEditingIndex(index);
    setErrors({});
  };

  const handleDelete = (index) => {
    onChange(categories.filter((_, itemIndex) => itemIndex !== index));

    if (editingIndex === index) {
      setForm(EMPTY_CATEGORY);
      setEditingIndex(null);
      setErrors({});
    } else if (editingIndex !== null && index < editingIndex) {
      setEditingIndex((current) => current - 1);
    }
  };

  const handleCancel = () => {
    setForm(EMPTY_CATEGORY);
    setEditingIndex(null);
    setErrors({});
  };

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">
          Machine Categories
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Define the machines in your factory and their failure
          characteristics.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        noValidate
      >
        {/* Category Name */}
        <div className="xl:col-span-2">
          <label
            htmlFor="category-name"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Category name
          </label>

          <input
            id="category-name"
            value={form.name}
            onChange={(event) =>
              updateField('name', event.target.value)
            }
            placeholder="e.g. Lathe"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          {errors.name && (
            <p className="mt-1 text-xs text-red-600">
              {errors.name}
            </p>
          )}
        </div>

        {/* Machine Count */}
        <div>
          <label
            htmlFor="category-count"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Machine count
          </label>

          <input
            id="category-count"
            type="number"
            min="0"
            step="1"
            value={form.count}
            onChange={(event) =>
              updateField('count', event.target.value)
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          {errors.count && (
            <p className="mt-1 text-xs text-red-600">
              {errors.count}
            </p>
          )}
        </div>

        {/* MTTF */}
        <div>
          <label
            htmlFor="category-mttf"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            MTTF
          </label>

          <input
            id="category-mttf"
            type="number"
            min="0"
            step="0.01"
            value={form.mttf}
            onChange={(event) =>
              updateField('mttf', event.target.value)
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          {errors.mttf && (
            <p className="mt-1 text-sm text-red-600">
              {errors.mttf}
            </p>
          )}
        </div>

        {/* Mean Repair Time */}
        <div>
          <label
            htmlFor="category-repair"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Mean repair time
          </label>

          <input
            id="category-repair"
            type="number"
            min="0"
            step="0.01"
            value={form.mean_repair_time}
            onChange={(event) =>
              updateField(
                'mean_repair_time',
                event.target.value
              )
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          {errors.mean_repair_time && (
            <p className="mt-1 text-xs text-red-600">
              {errors.mean_repair_time}
            </p>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex items-end gap-2 xl:col-span-4">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
          >
            {editingIndex === null
              ? 'Add Category'
              : 'Update Category'}
          </button>

          {editingIndex !== null && (
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Categories Table */}
      <div className="mt-6 overflow-x-auto">
        {categories.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            No machine categories configured yet.
          </div>
        ) : (
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="px-3 py-3 font-medium">
                  Category
                </th>
                <th className="px-3 py-3 font-medium">
                  Count
                </th>
                <th className="px-3 py-3 font-medium">
                  MTTF
                </th>
                <th className="px-3 py-3 font-medium">
                  Repair Time
                </th>
                <th className="px-3 py-3 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {categories.map((category, index) => (
                <tr
                  key={`${category.name}-${index}`}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-3 py-3 font-medium text-slate-900">
                    {category.name}
                  </td>

                  <td className="px-3 py-3 text-slate-600">
                    {category.count}
                  </td>

                  <td className="px-3 py-3 text-slate-600">
                    {category.mttf}
                  </td>

                  <td className="px-3 py-3 text-slate-600">
                    {category.mean_repair_time}
                  </td>

                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleEdit(index)}
                      className="mr-3 font-medium text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(index)}
                      className="font-medium text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}