export default function PrimaryButton({url, selected, extraClasses, children}) {
    return (
        <a href={url}
           className={
               "text-text-page text-center border-2 font-sans-serif " + extraClasses + " " +
               (selected ? "bg-text-page border-text-page text-white" : "border-secondary hover:bg-secondary")
               + " text-sm px-4 py-2 inline-block rounded-4xl transition-[color,background-color,translate] duration-200 hover:-translate-y-1"
           }>
            {children}
        </a>
    )
}
