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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup
} from '@/components/ui/select';
import { setFormValue, setGroupCount, clearForm } from '@/lib/slice';

// Label cell: left-aligned label text, an optional red asterisk, then an optional ⓘ tooltip.
function FieldLabel({ field, htmlFor }) {
  return (
    <Label
      htmlFor={htmlFor}
      className="min-w-0 gap-1 text-[13px] leading-tight font-normal text-muted-foreground"
    >
      <span>{field.label}</span>
      {field.required && <span className="text-destructive">*</span>}
      {field.info && (
        <span title={field.info} className="inline-flex">
          <InfoIcon className="size-3.5 shrink-0 cursor-help text-muted-foreground" />
        </span>
      )}
    </Label>
  );
}

// Renders the control part of a field (input / select / checkbox). Controlled:
// `value` comes from Redux and `onChange(next)` writes it back.
function FieldControl({ field, value, onChange }) {
  const id = `field-${field.name}`;

  if (field.type === 'select') {
    return (
      <Select value={value ?? ''} onValueChange={(v) => onChange(v)} className="w-full">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectGroup>
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <Checkbox
        id={id}
        name={field.name}
        checked={Boolean(value)}
        onCheckedChange={(checked) => onChange(checked === true)}
      />
    );
  }

  // text | number
  return (
    <Input
      id={id}
      name={field.name}
      type={field.type === 'number' ? 'number' : 'text'}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="text-[13px]"
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
          <Button variant="outline" onClick={() => onCountChange(count + 1)}>{field.addLabel}</Button>
        )}
        {field.removeLabel && (
          <Button
            variant="outline"
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
      <Button variant="ghost" size="icon" onClick={onClick} aria-label={button.name}>
        <Icon className="size-4" />
      </Button>
    );
  }

  return (
    <Button variant={button.variant === 'primary' ? 'default' : 'outline'} onClick={onClick}>
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
    <form className="flex h-full min-h-0 flex-col" onSubmit={(e) => e.preventDefault()}>
      <div className={`min-h-0 flex-1 overflow-y-auto ${hasRight ? 'flex flex-col gap-6 lg:flex-row' : ''}`}>
        {/* Left column */}
        <div className={`space-y-3 ${hasRight ? 'lg:flex-1' : ''}`}>
          {leftFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
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
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 border-t border-border pt-4">
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
