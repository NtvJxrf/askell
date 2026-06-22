import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"

const frameworks = ["Next.js", "SvelteKit", "Nuxt.js", "Remix", "Astro"]

export default function RenderField({ field }) {
    if (field.type === "combobox") {
        return (
                <Combobox items={frameworks}>
                    <ComboboxInput placeholder="Select a framework" />
                    <ComboboxContent>
                        <ComboboxEmpty>No items found.</ComboboxEmpty>
                        <ComboboxList>
                        {(item) => (
                            <ComboboxItem key={item} value={item}>
                            {item}
                            </ComboboxItem>
                        )}
                        </ComboboxList>
                    </ComboboxContent>
                </Combobox>
        )
    }
}
export function ComboboxExample() {
  return (
    <Combobox items={frameworks}>
      <ComboboxInput placeholder="Select a framework" />
      <ComboboxContent>
        <ComboboxEmpty>No items found.</ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}