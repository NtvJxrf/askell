'use client'
import { Controller } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Combobox, ComboboxInput, ComboboxPopover, ComboboxList, ComboboxOption, ComboboxContent, ComboboxItem } from "@/components/ui/combobox"
export default function RenderField({ data }) {
    switch (data.type) {
        case "input":
            return (
                <FieldController
                    data={data}
                    render={({ field, fieldState }) => (
                        <Input
                            {...field}
                            aria-invalid={fieldState.invalid}
                            type="number"
                            step={0.0001}
                            inputMode="numeric"
                            min={0}
                            className="w-full"
                            onChange={(e) =>
                                field.onChange(
                                e.target.value === "" ? "" : e.target.valueAsNumber
                            )}
                        />
                    )}
                />
            )

        case "inputp0":
            return (
                <FieldController
                    data={data}
                    render={({ field, fieldState }) => (
                        <Input
                            {...field}
                            aria-invalid={fieldState.invalid}
                            type="number"
                            step={0}
                            inputMode="numeric"
                            min={0}
                            className="w-full"
                            onChange={(e) =>
                            field.onChange(
                                e.target.value === "" ? "" : e.target.valueAsNumber
                            )}
                        />
                    )}
                />
            )

        case "select":
            return (
                <FieldController
                    data={data}
                    render={({ field, fieldState }) => (
                        <Select value={field.value} onValueChange={field.onChange} >
                            <SelectTrigger className="w-full min-w-0" aria-invalid={fieldState.invalid}>
                                <SelectValue />
                            </SelectTrigger>

                            <SelectContent className="w-auto min-w-[200px]">
                                {data.options.map((option) => (
                                <SelectItem key={option} value={option}>
                                    {option}
                                </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
            )

        case "checkbox":
            return (
                <FieldController
                    data={data}
                    render={({ field, fieldState }) => (
                        <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            aria-invalid={fieldState.invalid}
                        />
                    )}
                />
            )
        case "combobox":
            return (
                <FieldController
                    data={data}
                    render={({ field, fieldState }) => (
                        <Combobox
                            items={data.options}
                            value={field.value}
                            onValueChange={field.onChange}
                        >
                            <ComboboxInput showClear aria-invalid={fieldState.invalid} className="h-6 w-full min-w-0 overflow-hidden"/>
                            <ComboboxContent className="w-auto min-w-0">
                                <ComboboxList className="max-h-(--available-height) overflow-y-auto scrollbar-none">
                                    {(item) => (
                                        <ComboboxItem key={item} value={item}>
                                            {item}
                                            {data.itemLabels && (
                                                <span className="text-muted-foreground text-xs">
                                                    {` (остаток: ${data.itemLabels[item]?.toFixed(2) ?? 0})`}
                                                </span>
                                            )}
                                        </ComboboxItem>
                                    )}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                    )}
                />
            )
        default:
            return null
  }
}

function FieldLabel({ label, required }) {
  return (
    <Label className="flex items-center gap-1 whitespace-nowrap">
      {required && (
        <span className="text-destructive text-lg font-light leading-none">
          *
        </span>
      )}
      {label}:
    </Label>
  )
}

function FieldController({ data, render }) {
  return (
    <Controller
      name={data.name}
      control={data.control}
      rules={{
        required: data.required ? true : false,
      }}
      render={({ field, fieldState }) => (
        <div className="flex items-center gap-1.5">
          <FieldLabel label={data.label} required={data.required} />
          {render({ field, fieldState })}
        </div>
      )}
    />
  )
}