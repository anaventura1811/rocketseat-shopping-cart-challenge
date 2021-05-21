import { createContext, ReactNode, useContext, useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps) : JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {

    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  // atualiza os valores no localStorage em toda atualização do carrinho
  // com o useRef e o useEffect
  const prevCartRef = useRef<Product[]>();
    useEffect(() => {
      prevCartRef.current = cart;
    })
    const cartPreviousValue = prevCartRef.current ?? cart;

    useEffect(() => {
      if (cartPreviousValue !== cart) {
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
      }
    }, [cart, cartPreviousValue])

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart]; // para não alterar o array original
      const productExists = updatedCart.find(product => product.id === productId);
      const stock = await api.get(`/stock/${productId}`);

      const stockAmount = stock.data.amount;
      const currentAmount = productExists ? productExists.amount : 0; // quantidade do produto no carrinho;

      const amount = currentAmount + 1; // quantidade desejada

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExists) {
        productExists.amount = amount; // atualiza automaticamente o updated cart, atualiza quantidade do produto

      } else {
        const product = await api.get(`/products/${productId}`); // se for novo produto, atualiza
        const newProduct = {
          ...product.data,
          amount: 1, // primeira vez que tá sendo adicionado ao carrinho
        }

        updatedCart.push(newProduct);
      }

      setCart(updatedCart); // pra perpetuar as alterações no estado do carrinho
      // localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart)); // salva no localStorage

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
      try {
       const updatedCart = [...cart];
       const productIndex = updatedCart.findIndex(product => product.id === productId);

       if (productIndex >= 0) {
         updatedCart.splice(productIndex, 1);
         setCart(updatedCart);
        //  localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

       } else {
         throw Error();
       }
      } catch {
        toast.error('Erro na remoção do produto');
      }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
      try {
        if (amount <= 0) {
          return;
        }

        const stock = await api.get(`/stock/${productId}`);
        const stockAmount = stock.data.amount;

        if (amount > stockAmount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const updatedCart = [...cart];
        const productExists = updatedCart.find(product => product.id === productId);

        if (productExists) {
          productExists.amount = amount;
          setCart(updatedCart);
          // localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
        } else {
          throw Error();
        }

      } catch {
        toast.error('Erro na alteração de quantidade do produto');
      }
    };
   
    return (
      <CartContext.Provider
        value={{ cart, addProduct, removeProduct, updateProductAmount }}
      >
        {children}
      </CartContext.Provider>
    );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}