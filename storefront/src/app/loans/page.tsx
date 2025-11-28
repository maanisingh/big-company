'use client';

import { useState, useEffect } from 'react';
import { FileText, Check, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import { loansApi } from '@/lib/api';

export default function LoansPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [amount, setAmount] = useState<number>(0);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsData, loansData] = await Promise.all([
        loansApi.getProducts(),
        loansApi.getLoans(),
      ]);
      setProducts(productsData.products || []);
      setLoans(loansData.loans || []);
    } catch (error) {
      console.error('Failed to fetch loans data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!selectedProduct || !amount) return;

    setProcessing(true);
    try {
      const data = await loansApi.apply(selectedProduct.id, amount);
      setResult(data);
    } catch (error: any) {
      console.error('Loan application failed:', error);
      alert(error.response?.data?.error || 'Application failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'disbursed':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'active':
        return 'bg-blue-100 text-blue-700';
      case 'paid':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-red-100 text-red-700';
    }
  };

  const activeLoan = loans.find((l) =>
    ['pending', 'approved', 'disbursed', 'active'].includes(l.status)
  );

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
        <div className="flex items-center gap-4">
          <FileText className="w-12 h-12" />
          <div>
            <h1 className="text-xl font-semibold">Food Loans</h1>
            <p className="text-sm opacity-80">Interest-free loans for essential food items</p>
          </div>
        </div>
        {!activeLoan && (
          <button
            onClick={() => setShowApply(true)}
            className="mt-4 w-full bg-white text-purple-700 py-3 rounded-lg font-medium hover:bg-white/90 transition-colors"
          >
            Apply for Loan
          </button>
        )}
      </div>

      {/* Active Loan */}
      {activeLoan && (
        <section className="card border-2 border-purple-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(activeLoan.status)}`}>
                {activeLoan.status.toUpperCase()}
              </span>
              <h3 className="font-semibold mt-2">Loan #{activeLoan.loan_number}</h3>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-sm text-gray-500">Borrowed</p>
              <p className="font-semibold">{activeLoan.principal.toLocaleString()} RWF</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Outstanding</p>
              <p className="font-semibold text-purple-600">
                {activeLoan.outstanding_balance.toLocaleString()} RWF
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Due Date</p>
              <p className="font-semibold">{activeLoan.due_date}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Type</p>
              <p className="font-semibold capitalize">{activeLoan.loan_type} Loan</p>
            </div>
          </div>

          {activeLoan.status === 'active' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <p className="text-sm text-yellow-700">
                Loan will be auto-repaid from your purchases and deposits.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Loan Products */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Available Loan Products</h2>
        <div className="space-y-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="card cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                if (!activeLoan) {
                  setSelectedProduct(product);
                  setAmount(product.min_amount);
                  setShowApply(true);
                }
              }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{product.name}</h3>
                  <p className="text-sm text-gray-500">{product.description}</p>
                </div>
                <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  0% Interest
                </span>
              </div>
              <div className="mt-3 flex gap-4 text-sm">
                <span className="text-gray-600">
                  Min: <strong>{product.min_amount.toLocaleString()}</strong> RWF
                </span>
                <span className="text-gray-600">
                  Max: <strong>{product.max_amount.toLocaleString()}</strong> RWF
                </span>
                <span className="text-gray-600">
                  Term: <strong>{product.term_days}</strong> days
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Loan History */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Loan History</h2>
        <div className="card">
          {loans.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No loan history</p>
          ) : (
            <div className="space-y-3">
              {loans.map((loan) => (
                <div
                  key={loan.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">Loan #{loan.loan_number}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(loan.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{loan.principal.toLocaleString()} RWF</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(loan.status)}`}>
                      {loan.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Apply Modal */}
      {showApply && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
            {result ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold">Application Submitted!</h2>
                <p className="text-gray-600 mt-2">
                  Your loan application is being reviewed.
                </p>
                <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-600">Loan Number</p>
                  <p className="font-semibold text-lg">{result.loan.loan_number}</p>
                </div>
                <button
                  onClick={() => {
                    setShowApply(false);
                    setResult(null);
                    setSelectedProduct(null);
                    fetchData();
                  }}
                  className="btn-primary w-full mt-6 py-3 bg-purple-600 hover:bg-purple-700"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Apply for Loan</h2>
                  <button
                    onClick={() => {
                      setShowApply(false);
                      setSelectedProduct(null);
                    }}
                    className="text-gray-500"
                  >
                    Cancel
                  </button>
                </div>

                {/* Select Product */}
                {!selectedProduct && (
                  <div className="space-y-3 mb-6">
                    {products.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => {
                          setSelectedProduct(product);
                          setAmount(product.min_amount);
                        }}
                        className="w-full p-4 border-2 rounded-lg text-left hover:border-purple-500 transition-colors"
                      >
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-sm text-gray-500">
                          {product.min_amount.toLocaleString()} - {product.max_amount.toLocaleString()} RWF
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Product */}
                {selectedProduct && (
                  <>
                    <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-600">Selected Product</p>
                      <p className="font-semibold">{selectedProduct.name}</p>
                      <p className="text-sm text-gray-600">
                        0% Interest • {selectedProduct.term_days} days term
                      </p>
                    </div>

                    {/* Amount Input */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Loan Amount (RWF)
                      </label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                        min={selectedProduct.min_amount}
                        max={selectedProduct.max_amount}
                        className="input text-xl font-semibold text-center"
                      />
                      <p className="text-sm text-gray-500 mt-2 text-center">
                        Min: {selectedProduct.min_amount.toLocaleString()} • Max: {selectedProduct.max_amount.toLocaleString()}
                      </p>
                    </div>

                    {/* Terms */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg text-sm">
                      <p className="font-medium mb-2">Loan Terms:</p>
                      <ul className="space-y-1 text-gray-600">
                        <li>• This loan is for food purchases only</li>
                        <li>• 0% interest rate</li>
                        <li>• Repayment due in {selectedProduct.term_days} days</li>
                        <li>• Auto-deducted from wallet deposits & gas rewards</li>
                      </ul>
                    </div>

                    {/* Submit */}
                    <button
                      onClick={handleApply}
                      disabled={
                        !amount ||
                        amount < selectedProduct.min_amount ||
                        amount > selectedProduct.max_amount ||
                        processing
                      }
                      className="btn-primary w-full py-3 bg-purple-600 hover:bg-purple-700"
                    >
                      {processing ? 'Submitting...' : `Apply for ${amount.toLocaleString()} RWF`}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
