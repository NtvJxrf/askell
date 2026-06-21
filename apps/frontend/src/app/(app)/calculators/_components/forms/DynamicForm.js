'use client';

// Generic, config-driven calculator form renderer.
//
// Reads a form schema from ../calc-config (see CALCULATOR_FORMS) and builds the
// UI: labelled fields (text / number / select / checkbox), a repeatable group,
// and a button row. Every field is a controlled input bound to Redux (keyed by
// formId), so each calculator keeps its own values independently and they
// survive navigation between pages. «Рассчитать» logs the collected values;
// «Очистить» resets the current form.
import { useDispatch, useSelector } from 'react-redux';
import { InfoIcon, ZapIcon } from '@/components/icons';
import { Button } from '@/components/Button';
import { setFormValue, setGroupCount, clearForm } from '@/lib/slice';

const controlClass =
  'w-full rounded-md border border-black/[.12] bg-transparent px-3 py-1 text-[13px] outline-none transition-colors focus:border-violet-500 dark:border-white/[.18] dark:focus:border-violet-400';

// Label cell: left-aligned label text, an optional red asterisk, then an optional ⓘ tooltip.
function FieldLabel({ field, htmlFor }) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex min-w-0 items-center gap-1 text-[13px] leading-tight text-zinc-600 dark:text-zinc-400"
    >
      <span>{field.label}</span>
      {field.required && <span className="text-red-500">*</span>}
      {field.info && (
        <span title={field.info} className="inline-flex">
          <InfoIcon className="size-3.5 shrink-0 cursor-help text-zinc-400" />
        </span>
      )}
    </label>
  );
}

// Renders the control part of a field (input / select / checkbox). Controlled:
// `value` comes from Redux and `onChange(next)` writes it back.
function FieldControl({ field, value, onChange }) {
  const id = `field-${field.name}`;

  if (field.type === 'select') {
    return (
      <select
        id={id}
        name={field.name}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={controlClass}
      >
        <option value="" />
        {(field.options ?? []).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <input
        id={id}
        name={field.name}
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-black/[.25] text-violet-600 focus:ring-violet-500 dark:border-white/[.25]"
      />
    );
  }

  // text | number
  return (
    <input
      id={id}
      name={field.name}
      type={field.type === 'number' ? 'number' : 'text'}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={controlClass}
    />
  );
}

// One labelled row: a left-aligned label in a fixed column and a large control
// that fills the rest. Rows are capped to a comfortable width and left-aligned, so
// labels line up and every input stays large and fully visible.
function FieldRow({ field, value, onChange }) {
  return (
    <div className="grid max-w-md grid-cols-[10rem_minmax(0,1fr)] items-center gap-x-3">
      <FieldLabel field={field} htmlFor={`field-${field.name}`} />
      <FieldControl field={field} value={value} onChange={onChange} />
    </div>
  );
}

// Expands a repeatable group into its interleaved материал/пленка rows:
// материал 1, пленка 1, материал 2, … — materials always one more than films.
// `count` is the number of пленки. Field names are suffixed _1, _2, … and the
// index is appended to each label.
function buildGroupRows(field, count) {
  const rows = [];
  for (let i = 0; i <= count; i += 1) {
    rows.push({
      ...field.material,
      name: `${field.material.name}_${i + 1}`,
      label: `${field.material.label} ${i + 1}`,
      key: `m${i}`,
    });
    if (i < count) {
      rows.push({
        ...field.film,
        name: `${field.film.name}_${i + 1}`,
        label: `${field.film.label} ${i + 1}`,
        key: `f${i}`,
      });
    }
  }
  return rows;
}

// Repeatable group (Триплекс «ПФ» stack). The current `count` and field values
// live in Redux, so add/remove and edits survive navigation. Add/remove grow or
// shrink the stack by one материал+пленка pair, but never below `min`.
function FieldGroup({ field, count, onCountChange, getValue, setValue }) {
  const min = field.min ?? 1;
  const rows = buildGroupRows(field, count);

  return (
    <div className="space-y-3">
      <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
        {rows.map((row) => (
          <FieldRow
            key={row.key}
            field={row}
            value={getValue(row)}
            onChange={(v) => setValue(row.name, v)}
          />
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {field.addLabel && (
          <Button onClick={() => onCountChange(count + 1)}>{field.addLabel}</Button>
        )}
        {field.removeLabel && (
          <Button
            onClick={() => onCountChange(Math.max(min, count - 1))}
            disabled={count <= min}
          >
            {field.removeLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ field, getValue, setValue, getGroupCount, onGroupCount }) {
  if (field.type === 'group') {
    return (
      <FieldGroup
        field={field}
        count={getGroupCount(field)}
        onCountChange={(c) => onGroupCount(field.name, c)}
        getValue={getValue}
        setValue={setValue}
      />
    );
  }
  return (
    <FieldRow
      field={field}
      value={getValue(field)}
      onChange={(v) => setValue(field.name, v)}
    />
  );
}

const BUTTON_ICONS = { zap: ZapIcon };

function FormButton({ button, onClick }) {
  const Icon = button.icon ? BUTTON_ICONS[button.icon] : null;

  if (Icon && !button.label) {
    return (
      <Button variant="ghost" iconOnly onClick={onClick} aria-label={button.name}>
        <Icon className="size-4" />
      </Button>
    );
  }

  return (
    <Button variant={button.variant === 'primary' ? 'primary' : 'secondary'} onClick={onClick}>
      {Icon && <Icon className="size-4" />}
      {button.label}
    </Button>
  );
}

export function DynamicForm({ config, formId }) {
  const dispatch = useDispatch();
  const formState = useSelector((s) => s.app.forms[formId]);
  const values = formState?.values ?? {};
  const groups = formState?.groups ?? {};

  const fields = config?.fields ?? [];
  const buttons = config?.buttons ?? [];

  // Current value of a field, falling back to its configured default when the
  // user hasn't touched it yet.
  const getValue = (field) => {
    const stored = values[field.name];
    if (stored !== undefined) return stored;
    if (field.type === 'checkbox') return Boolean(field.defaultValue);
    return field.defaultValue ?? '';
  };
  const setValue = (name, value) => dispatch(setFormValue({ formId, name, value }));

  const getGroupCount = (field) => groups[field.name] ?? field.min ?? 1;
  const onGroupCount = (name, count) => dispatch(setGroupCount({ formId, name, count }));

  // Flatten every field (expanding repeatable groups) into a { name: value } map.
  const collectValues = () => {
    const out = {};
    for (const field of fields) {
      if (field.type === 'group') {
        for (const row of buildGroupRows(field, getGroupCount(field))) {
          out[row.name] = getValue(row);
        }
      } else {
        out[field.name] = getValue(field);
      }
    }
    return out;
  };

  const handleButton = (button) => {
    if (button.name === 'calculate') {
      console.log(`[${formId}] значения формы:`, collectValues());
    } else if (button.name === 'clear') {
      dispatch(clearForm({ formId }));
    }
  };

  const leftFields = fields.filter((f) => (f.column ?? 'left') !== 'right');
  const rightFields = fields.filter((f) => f.column === 'right');
  const hasRight = rightFields.length > 0;

  const renderField = (field) => (
    <Field
      key={field.name}
      field={field}
      getValue={getValue}
      setValue={setValue}
      getGroupCount={getGroupCount}
      onGroupCount={onGroupCount}
    />
  );

  return (
    <form className="flex h-full flex-col" onSubmit={(e) => e.preventDefault()}>
      <div className={`flex-1 ${hasRight ? 'flex flex-col gap-6 lg:flex-row' : ''}`}>
        {/* Left column */}
        <div className={`space-y-3 ${hasRight ? 'lg:flex-1' : ''}`}>
          {leftFields.length === 0 ? (
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              Поля ещё не добавлены
            </p>
          ) : (
            leftFields.map(renderField)
          )}
        </div>

        {/* Right column (only when fields target it) */}
        {hasRight && (
          <div className="space-y-3 lg:flex-1">{rightFields.map(renderField)}</div>
        )}
      </div>

      {/* Button row */}
      {buttons.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {buttons.map((button) => (
            <FormButton
              key={button.name}
              button={button}
              onClick={() => handleButton(button)}
            />
          ))}
        </div>
      )}
    </form>
  );
}
