import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useApp } from "@/contexts/AppContext";

export const Route = createFileRoute("/cart")({ component: CartPage });

function CartPage() {
  const { t, cart, removeFromCart, updateQty, cartTotal } = useApp();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-4xl font-extrabold mb-6 sm:mb-8">{t.cart.title}</h1>


        {cart.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border rounded-2xl">
            <p className="text-xl font-bold mb-2">{t.cart.empty}</p>
            <p className="text-muted-foreground mb-6">{t.cart.emptyDesc}</p>
            <Link
              to="/shop"
              className="inline-flex px-6 py-3 bg-brand text-brand-foreground rounded-xl font-bold hover:brand-glow"
            >
              {t.cart.goShopping}
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-[1fr_320px] gap-8">
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.productId + item.planId}
                  className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl"
                >
                  <div className="size-14 bg-muted rounded-lg grid place-items-center overflow-hidden">
                    {item.iconUrl ? (
                      <img src={item.iconUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <span className="font-bold text-brand">{item.productName.slice(0, 2)}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">{item.productName}</div>
                    <div className="text-xs text-muted-foreground">{item.planLabel}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.productId, item.planId, item.quantity - 1)}
                      className="size-8 border border-border rounded"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.productId, item.planId, item.quantity + 1)}
                      className="size-8 border border-border rounded"
                    >
                      +
                    </button>
                  </div>
                  <div className="font-bold min-w-24 text-end">
                    {item.price * item.quantity} {t.common.currency}
                  </div>
                  <button
                    onClick={() => removeFromCart(item.productId, item.planId)}
                    className="text-destructive text-xs hover:underline"
                  >
                    {t.cart.remove}
                  </button>
                </div>
              ))}
            </div>

            <aside className="h-fit p-6 bg-card border border-border rounded-2xl sticky top-24">
              <div className="flex justify-between mb-4">
                <span className="text-muted-foreground">{t.cart.subtotal}</span>
                <span className="font-bold">
                  {cartTotal} {t.common.currency}
                </span>
              </div>
              <div className="flex justify-between text-lg mb-6 pt-4 border-t border-border">
                <span className="font-bold">{t.cart.total}</span>
                <span className="font-extrabold text-brand">
                  {cartTotal} {t.common.currency}
                </span>
              </div>
              <Link
                to="/checkout"
                className="block text-center px-6 py-3 bg-brand text-brand-foreground rounded-xl font-bold hover:brand-glow"
              >
                {t.cart.checkout}
              </Link>
            </aside>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
