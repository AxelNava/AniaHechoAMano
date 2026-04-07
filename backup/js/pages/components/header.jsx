import PrimaryButton from "./primary-button.jsx";
export default function Header() {
    return (
        <nav className="max-lg:relative">
            <ul className="grid max-lg:bg-white max-sm:px-2 max-lg:grid-cols-[auto_auto_auto] gap-x-4 max-lg:w-[100dvw] max-sm:gap-x-2 max-sm:*:*:text-[0.75rem] max-sm:*:*:px-2 lg:grid-flow-col max-lg:gap-y-8 lg:gap-4 justify-items-center items-center justify-center py-4 navigation-buttons transition-transform">
                <li>
                    <PrimaryButton url={'/'} selected={true}>Inicio</PrimaryButton>
                </li>
                <li>
                    <PrimaryButton url={''}>Todos</PrimaryButton>
                </li>
                <li>
                    <PrimaryButton url={''}>Adornos de fiesta</PrimaryButton>
                </li>
                <li>
                    <PrimaryButton url={''}>Papelería creativa</PrimaryButton>
                </li>
                <li>
                    <PrimaryButton url={''}>Postres</PrimaryButton>
                </li>
            </ul>
        </nav>
    )
}

/**
 *
 *                 <li>
 *                     <PrimaryButton url={''} >Piñatas</PrimaryButton>
 *                 </li>
 *                 <li>
 *                     <PrimaryButton url={''}>Adornos</PrimaryButton>
 *                 </li>
 *                 <li>
 *                     <PrimaryButton url={''}>Gelatinas y postres</PrimaryButton>
 *                 </li>
 *                 <li>
 *                     <PrimaryButton url={''}>Ramos florales</PrimaryButton>
 *                 </li>
 *                 <li>
 *                     <PrimaryButton url={''}>Papelería creativa</PrimaryButton>
 *                 </li>
 *                 <li>
 *                     <PrimaryButton url={''}>Desayunos sorpresa</PrimaryButton>
 *                 </li>
 *                 <li>
 *                     <PrimaryButton url={''}>Fotos polaroid</PrimaryButton>
 *                 </li>
 *                 <li>
 *                     <PrimaryButton url={''}>Cajas sorpresa</PrimaryButton>
 *                 </li>
 *                 <li>
 *                     <input type="checkbox" id="others" className="hidden checkbox-other"/>
 *                     <label htmlFor="others"
 *                            className="last button-others lg:hidden text-text-page text-center border-2 border-secondary font-sans-serif text-sm px-4 py-2 inline-block rounded-4xl transition-[color,background-color,translate] duration-200 hover:-translate-y-1">Otros</label>
 *                 </li>
 *
 */
