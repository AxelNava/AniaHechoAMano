export default function SecondaryButton ({url, selected, children}) {
return (
   <a href={url}
   className={"text-text-page text-center border-2 font-sans-serif text-[1.1rem] "+
               (selected ? "bg-text-page border-text-page text-white" : "bg-white border-text-page hover:bg-text-page hover:text-white")
               + " text-sm px-6 py-3 inline-block rounded-3xl transition-[color,background-color,translate] duration-200 hover:-translate-y-1"}>
       {children}
   </a>
)
}
