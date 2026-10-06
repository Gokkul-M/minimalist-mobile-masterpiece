import {
  Coffee, ShoppingBag, ShoppingCart, Car, Bus, Train, Plane, Fuel, Bike, Receipt, Zap, Droplets, Wifi, Smartphone, Tv,
  HeartPulse, Pill, Stethoscope, Dumbbell, Sparkles, Film, Music, Gamepad2, Ticket, CalendarDays, Hotel, Luggage, Wallet,
  Banknote, CreditCard, PiggyBank, Landmark, TrendingUp, Briefcase, GraduationCap, BookOpen, Baby, Dog, Gift, Shirt,
  Scissors, Home, Wrench, Hammer, Sofa, Lightbulb, Utensils, Pizza, Wine, Beer, IceCream, Apple, Cake, Laptop, Camera,
  Flower2, Church, HandHeart, Shield, Package, MoreHorizontal, ArrowDownLeft, type LucideIcon,
} from 'lucide-react';

/** Selectable icons for categories (key is stored in the ledger). */
export const ICON_SET: Record<string, LucideIcon> = {
  coffee: Coffee, food: Utensils, pizza: Pizza, wine: Wine, beer: Beer, icecream: IceCream, apple: Apple, cake: Cake,
  groceries: ShoppingCart, shopping: ShoppingBag, clothes: Shirt, gift: Gift, salon: Scissors,
  car: Car, bus: Bus, train: Train, plane: Plane, fuel: Fuel, bike: Bike,
  bill: Receipt, power: Zap, water: Droplets, wifi: Wifi, phone: Smartphone, tv: Tv,
  health: HeartPulse, medicine: Pill, doctor: Stethoscope, gym: Dumbbell,
  fun: Sparkles, movie: Film, music: Music, games: Gamepad2, ticket: Ticket,
  calendar: CalendarDays, hotel: Hotel, travel: Luggage,
  wallet: Wallet, cash: Banknote, card: CreditCard, savings: PiggyBank, bank: Landmark, invest: TrendingUp, salary: ArrowDownLeft, work: Briefcase,
  education: GraduationCap, books: BookOpen, kids: Baby, pets: Dog,
  home: Home, repair: Wrench, tools: Hammer, furniture: Sofa, utilities: Lightbulb, laptop: Laptop, camera: Camera,
  flowers: Flower2, worship: Church, charity: HandHeart, insurance: Shield, package: Package, other: MoreHorizontal,
};

const DEFAULTS: Record<string, string> = {
  'Food & Drink': 'coffee', Groceries: 'groceries', Shopping: 'shopping', Transport: 'car', Bills: 'bill', Health: 'health',
  Entertainment: 'fun', Travel: 'travel', Salary: 'salary', Other: 'other',
};

export const iconKeyFor = (category: string, chosen: Record<string, string> = {}) => chosen[category] ?? DEFAULTS[category] ?? 'wallet';
export const categoryIconFor = (category: string, chosen: Record<string, string> = {}): LucideIcon => ICON_SET[iconKeyFor(category, chosen)] ?? Wallet;
