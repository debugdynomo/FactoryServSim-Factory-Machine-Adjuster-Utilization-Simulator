import React, { useState } from 'react';
import { Layers, Hash, Clock, Timer, Plus, Pencil, Trash2, X } from 'lucide-react';

const EMPTY_CATEGORY = {
  name: '',
  count: 0,
  mttf: 100,
  mean_repair_time: 10,
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
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
      <div className="mb-6 flex items-start gap-3 border-b border-slate-100 pb-4">
        <div className="mt-1 rounded-md bg-slate-100 p-2 text-slate-700">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Machine Categories
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Define the machines in your factory and their failure
            characteristics.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-5 md:grid-cols-2 xl:grid-cols-4 rounded-lg bg-slate-50 p-5 border border-slate-200"
        noValidate
      >
        {/* Category Name */}
        <div className="xl:col-span-2">
          <label
            htmlFor="category-name"
            className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700"
          >
            <Layers className="h-4 w-4 text-slate-400" />
            Category name
          </label>

          <input
            id="category-name"
            value={form.name}
            onChange={(event) =>
              updateField('name', event.target.value)
            }
            placeholder="e.g. Lathe"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20"
          />

          {errors.name && (
            <p className="mt-1 text-xs font-medium text-red-600">
              {errors.name}
            </p>
          )}
        </div>

        {/* Machine Count */}
        <div>
          <label
            htmlFor="category-count"
            className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700"
          >
            <Hash className="h-4 w-4 text-slate-400" />
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
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20"
          />

          {errors.count && (
            <p className="mt-1 text-xs font-medium text-red-600">
              {errors.count}
            </p>
          )}
        </div>

        {/* MTTF */}
        <div>
          <label
            htmlFor="category-mttf"
            className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700"
          >
            <Clock className="h-4 w-4 text-slate-400" />
            MTTF (hrs)
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
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20"
          />

          {errors.mttf && (
            <p className="mt-1 text-sm font-medium text-red-600">
              {errors.mttf}
            </p>
          )}
        </div>

        {/* Mean Repair Time */}
        <div>
          <label
            htmlFor="category-repair"
            className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700"
          >
            <Timer className="h-4 w-4 text-slate-400" />
            Mean repair time (hrs)
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
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20"
          />

          {errors.mean_repair_time && (
            <p className="mt-1 text-xs font-medium text-red-600">
              {errors.mean_repair_time}
            </p>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex items-end gap-3 xl:col-span-3">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2 font-semibold text-white transition hover:bg-slate-800"
          >
            {editingIndex === null ? (
              <>
                <Plus className="h-4 w-4" /> Add Category
              </>
            ) : (
              <>
                <Pencil className="h-4 w-4" /> Update Category
              </>
            )}
          </button>

          {editingIndex !== null && (
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
          )}
        </div>
      </form>

      {/* Categories Table */}
      <div className="mt-8 overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center bg-slate-50 p-10 text-center text-sm text-slate-500">
            <Layers className="mb-3 h-8 w-8 text-slate-400" />
            <p className="font-medium text-slate-600">No machine categories configured yet.</p>
            <p>Add a category above to get started.</p>
          </div>
        ) : (
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-slate-900 text-slate-100">
              <tr>
                <th className="px-4 py-3.5 font-semibold">Category</th>
                <th className="px-4 py-3.5 font-semibold">Count</th>
                <th className="px-4 py-3.5 font-semibold">MTTF (hrs)</th>
                <th className="px-4 py-3.5 font-semibold">Repair Time (hrs)</th>
                <th className="px-4 py-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {categories.map((category, index) => (
                <tr
                  key={`${category.name}-${index}`}
                  className="transition hover:bg-slate-50"
                >
                  <td className="px-4 py-3.5 font-semibold text-slate-900">
                    {category.name}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-700">
                    {category.count}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">
                    {category.mttf}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">
                    {category.mean_repair_time}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => handleEdit(index)}
                        className="flex items-center gap-1 font-medium text-blue-600 transition hover:text-blue-800"
                      >
                        <Pencil className="h-4 w-4" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(index)}
                        className="flex items-center gap-1 font-medium text-red-600 transition hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </div>
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