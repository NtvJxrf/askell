'use server'
export default async function WidgetPage() {
    console.log('build widget customer order page')
    return (
        <div>
            <h1>Customer Order widget</h1>
            {Array.from({ length: 100 }, (_, i) => (
                <p key={i}>{i * Math.random()}</p>
            ))}
        </div>
    );
}