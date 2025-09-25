import defaultImage from '@images/PXL_20250201_210547830~2.jpg'

import Footer from './components/footer.jsx'
import Header from './components/header.jsx'
import PrimaryLogo  from "./primary-logo.jsx";
import SecondaryButton from "./components/secondary-button.jsx";
import Heading1 from "./components/heading1.jsx";
import Card from "./components/card.jsx";

export default function Welcome() {
    let someTags = {
        ADORNOS: "Adornos",
        PAPELERIA: "Papelería creativa",
        CAJAS: "Cajas",
        DESAYUNOS: "Desayunos",
    }
    return (
        <div className={"grid grid-rows-[auto_auto_1fr]"}>
            <Header/>
            <main>
                <section className="bg-primary py-12">
                    <PrimaryLogo isMainTitle={true}/>
                    <p className="mt-10 mx-auto w-[50ch] text-xl text-center text-text-page2 leading-9">Creaciones
                        únicas y personalizadas para hacer de tus momentos
                        especiales algo inolvidable.
                        Cada pieza está hecha con amor y dedicación.</p>
                    <div
                        className="mt-10 mx-auto grid grid-cols-[auto_auto] place-content-center gap-x-5   grid-flow-col">
                        <SecondaryButton url={``} selected={true}>Ver productos</SecondaryButton>
                        <SecondaryButton>Contactar</SecondaryButton>
                    </div>
                </section>
                <section className="my-14">
                    <Heading1 className={"text-text-page my-2"}>Nuestros productos</Heading1>
                    <p className={"text-center text-text-page2 text-balance w-[50ch] leading-8 text-xl mx-auto"}>Descubre
                        nuestra colección de creaciones artesanales, cada una hecha con dedicación y amor al
                        detalle.</p>
                    <article
                        className={`grid grid-rows-[1fr_fit-content] max-md:mx-10 md:grid-cols-3 gap-4 md:gap-6 my-19 lg:mx-40`}>
                        <Card title={"Adorno de graduación elegante"} className={"row-span-2 md:col-span-2"}
                              tags={someTags} imageSrc={defaultImage}>
                            Decoración perfecta para celebrar el logro académico con estilo y elegancia.
                        </Card>
                        <Card title={"Adorno de graduación elegante"} className={"row-span-2"} tags={someTags}
                              imageSrc={""}>
                            Decoración perfecta para celebrar el logro académico con estilo y elegancia.
                        </Card>
                        <Card title={"Adorno de graduación elegante"} className={"row-span-2"} tags={someTags}
                              imageSrc={""}>
                            Decoración perfecta para celebrar el logro académico con estilo y elegancia.
                        </Card>
                        <Card title={"Adorno de graduación elegante"} className={"row-span-2"} tags={someTags}
                              imageSrc={""}>
                            Decoración perfecta para celebrar el logro académico con estilo y elegancia.
                        </Card>
                        <Card title={"Adorno de graduación elegante"} className={"row-span-2"} tags={someTags}
                              imageSrc={""}>
                            Decoración perfecta para celebrar el logro académico con estilo y elegancia.
                        </Card>
                    </article>
                </section>
            </main>
            <Footer/>
        </div>
    )
}
