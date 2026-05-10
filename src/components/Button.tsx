type ButtonProps = {
  children: string;
};

export default function Button({ children }: ButtonProps) {
  return (
    <>
      <button  className="bg-violet-600 hover:bg-violet-500 transitions-colors rounded px-2 py-1 disabled:opacity-30 disabled:cursor-not-allowed">{children}</button>
    </>
  );
}
