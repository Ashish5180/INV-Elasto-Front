import React, { useState, useEffect, useCallback } from "react";
import { FaSearch, FaSpinner } from "react-icons/fa";
import { motion } from "framer-motion";

const ProductInventory = () => {
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedProductId, setSelectedProductId] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [logs, setLogs] = useState([]);
    const [transaction, setTransaction] = useState({
        particulars: "",
        inward: 0,
        outward: 0,
        remarks: "",
        shift: "",
        workerName: "",
        batchNumber: "",
        actualProduction: 0,
        rejection: 0,
        machineNo: "",
        supervisedBy: "",
        timeStart: "",
        timeEnd: "",
        curingTemp: "",
        reworkScrap: 0
    });
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch products on component mount
    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const response = await fetch("https://inv-elasto-back-production.up.railway.app/api/products");
            const data = await response.json();
            setProducts(data);
            setFilteredProducts(data);  // Set initial filtered products to all products
            setLoading(false);
        } catch (error) {
            console.error("Error fetching products:", error);
            setErrorMessage("Failed to load products.");
            setLoading(false);
        }
    };

    const fetchLogs = useCallback(async (productId) => {
        setLoading(true);
        try {
            const response = await fetch(
                `https://inv-elasto-back-production.up.railway.app/api/products/${productId}/logs`
            );
            const proddata = await fetch(
                `https://inv-elasto-back-production.up.railway.app/api/products/${productId}`
            );
            const pdata = await proddata.json();
            const data = await response.json();

            setLogs(pdata.product.transactionLogs || []);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching logs:", error);
            setErrorMessage("Failed to load transaction logs.");
            setLoading(false);
        }
    }, []);

    const handleProductSelection = (productId) => {
        const selectedProduct = products.find(product => product._id === productId);
        setSelectedProductId(productId);
        setSelectedProduct(selectedProduct);
        fetchLogs(productId);
        console.log(selectedProduct);
    };

    const handleSearch = (e) => {
        setSearchQuery(e.target.value);
        if (e.target.value === "") {
            setFilteredProducts(products);
        } else {
            const filtered = products.filter((product) =>
                product.articleName.toLowerCase().includes(e.target.value.toLowerCase())
            );
            setFilteredProducts(filtered);
        }
    };

    const handleLogTransaction = async (e) => {
        e.preventDefault();

        if (!selectedProductId) {
            alert("Please select a product first.");
            return;
        }

        if (transaction.inward < 0 || transaction.outward < 0) {
            alert("Inward and outward quantities cannot be negative.");
            return;
        }

        if (transaction.inward === 0 && transaction.outward === 0) {
            alert("Both inward and outward quantities cannot be zero.");
            return;
        }

        if (!transaction.particulars) {
            alert("Particulars are required.");
            return;
        }

        setLoading(true);
        setErrorMessage("");

        try {
            const proddata = await fetch(
                `https://inv-elasto-back-production.up.railway.app/api/products/${selectedProductId}`
            );
            const pdata = await proddata.json();
            const productResponse = await fetch(
                `https://inv-elasto-back-production.up.railway.app/api/products/${selectedProductId}/log`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(transaction),
                }
            );
           console.log(productResponse);
           console.log(transaction);
            if (!productResponse.ok) {
                const errorDetails = await productResponse.json();
                throw new Error(errorDetails.message || "Failed to log product transaction.");
            }

            const updatedProduct = await productResponse.json();
            setLogs(updatedProduct.logs || []);

            const formulations = pdata.product.formulations || [];
            const formulaPromises = formulations.map(async (formula) => {
                const formulaId = formula.formulaName;
                const formulaFillWeight = formula.fillWeight;

                const formulaTransaction = {
                    orderNo: transaction.particulars,
                    inward: transaction.inward,
                    outward: transaction.outward,
                    particulars: "deducted automatically.",
                    fillWeight: formulaFillWeight
                   
                };

                try {
                    const response = await fetch(
                        `https://inv-elasto-back-production.up.railway.app/api/formulas/${formulaId}/logformulafromproduct`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(formulaTransaction),
                        }
                    );

                    if (!response.ok) {
                        const errorDetails = await response.json();
                        throw new Error(`Error logging formula ${formulaId}: ${errorDetails.message || "Unknown error"}`);
                    }
                } catch (error) {
                    console.error(error.message);
                    return `Formula ${formulaId} failed: ${error.message}`;
                }
            });

            await Promise.all(formulaPromises);

            setTransaction({ particulars: "", inward: 0, outward: 0, remarks: "" });
        } catch (error) {
            console.error("Error logging transaction:", error);
            setErrorMessage(error.message || "Failed to log transaction.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6 bg-gray-50 shadow-2xl rounded-lg mt-12">
            <h1 className="text-4xl font-semibold text-center text-gray-800 mb-12">
                Product Inventory Logging System
            </h1>

            <div className="products-section mb-8">
                <h2 className="text-3xl font-medium text-gray-700 mb-6">Products</h2>

                <div className="flex items-center space-x-4 mb-4">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={handleSearch}
                        placeholder="Search Products"
                        className="p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-1/3"
                    />
                    <FaSearch className="text-gray-500" />
                </div>

                {loading ? (
                    <p className="text-gray-600">Loading products...</p>
                ) : errorMessage ? (
                    <p className="text-red-600">{errorMessage}</p>
                ) : (
                    <motion.ul
                        className="space-y-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        {filteredProducts.map((product) => (
                            <motion.li key={product._id} whileHover={{ scale: 1.05 }}>
                                <button
                                    onClick={() => handleProductSelection(product._id)}
                                    className={`w-full text-left p-4 rounded-lg border transition duration-300 ${selectedProductId === product._id
                                            ? "bg-blue-600 text-white"
                                            : "bg-white hover:bg-blue-100"
                                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                >
                                    <span className="font-semibold">{product.articleName}</span>
                                    <span className="font-semibold m-4 text-blue-500">{product.manufacturing}</span>
                                </button>
                            </motion.li>
                        ))}
                    </motion.ul>
                )}
            </div>

            {selectedProductId && (
                <div className="transaction-section mt-12">
                    <h2 className="text-3xl font-medium text-gray-700 mb-6">Log Transaction</h2>
                    <form onSubmit={handleLogTransaction} className="space-y-6">
                        <div className="flex flex-col">
                            <label className="text-lg text-gray-700">Particulars</label>
                            <input
                                type="text"
                                value={transaction.particulars}
                                onChange={(e) =>
                                    setTransaction({
                                        ...transaction,
                                        particulars: e.target.value,
                                    })
                                }
                                required
                                className="p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {selectedProduct?.manufacturing === "Moulding" && (
                            <>
                                <div className="flex flex-col">
                                    <label className="text-lg text-gray-700">Shift</label>
                                    <input
                                        type="text"
                                        value={transaction.shift}
                                        onChange={(e) =>
                                            setTransaction({
                                                ...transaction,
                                                shift: e.target.value,
                                            })
                                        }
                                        required
                                        className="p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-lg text-gray-700">Name of worker(s)</label>
                                    <input
                                        type="text"
                                        value={transaction.workerName}
                                        onChange={(e) =>
                                            setTransaction({
                                                ...transaction,
                                                workerName: e.target.value,
                                            })
                                        }
                                        required
                                        className="p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-lg text-gray-700">Batch Number</label>
                                    <input
                                        type="text"
                                        value={transaction.batchNumber}
                                        onChange={(e) =>
                                            setTransaction({
                                                ...transaction,
                                                batchNumber: e.target.value,
                                            })
                                        }
                                        required
                                        className="p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-lg text-gray-700">Actual production</label>
                                    <input
                                        type="number"
                                        value={transaction.actualProduction}
                                        onChange={(e) =>
                                            setTransaction({
                                                ...transaction,
                                                actualProduction: parseFloat(e.target.value) || 0,
                                            })
                                        }
                                        required
                                        className="p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="flex flex-col">
                                    <label className="text-lg text-gray-700">Inward Quantity</label>
                                    <input
                                        type="number"
                                        value={transaction.inward}
                                        onChange={(e) =>
                                            setTransaction({
                                                ...transaction,
                                                inward: parseFloat(e.target.value) || 0,
                                            })
                                        }
                                        required
                                        className="p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="flex flex-col">
                                    <label className="text-lg text-gray-700">Outward Quantity</label>
                                    <input
                                        type="number"
                                        value={transaction.outward}
                                        onChange={(e) =>
                                            setTransaction({
                                                ...transaction,
                                                outward: parseFloat(e.target.value) || 0,
                                            })
                                        }
                                        required
                                        className="p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="flex flex-col">
                                    <label className="text-lg text-gray-700">Rejection</label>
                                    <input
                                        type="number"
                                        value={transaction.rejection}
                                        onChange={(e) =>
                                            setTransaction({
                                                ...transaction,
                                                rejection: parseFloat(e.target.value) || 0,
                                            })
                                        }
                                        required
                                        className="p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-lg text-gray-700">Machine No.</label>
                                    <input
                                        type="text"
                                        value={transaction.machineNo}
                                        onChange={(e) =>
                                            setTransaction({
                                                ...transaction,
                                                machineNo: e.target.value,
                                            })
                                        }
                                        required
                                        className="p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-lg text-gray-700">Supervised by</label>
                                    <input
                                        type="text"
                                        value={transaction.supervisedBy}
                                        onChange={(e) =>
                                            setTransaction({
                                                ...transaction,
                                                supervisedBy: e.target.value,
                                            })
                                        }
                                        required
                                        className="p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </>
                        )}

                        {selectedProduct?.manufacturing === "Extrusion" && (
                            <>
                                <div className="flex flex-col">
                                    <label className="text-lg text-gray-700">Shift</label>
                                    <input
                                        type="text"
                                        value={transaction.shift}
                                        onChange={(e) =>
                                            setTransaction({
                                                ...transaction,
                                                shift: e.target.value,
                                            })
                                        }
                                        required
                                        className="p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-lg text-gray-700">Name of worker(s)</label>
                                    <input
                                        type="text"
                                        value={transaction.workerName}
                                        onChange={(e) =>
                                            setTransaction({
                                                ...transaction,
                                                workerName: e.target.value,
                                            })
                                        }
                                        required
                                        className="p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-lg text-gray-700">Batch Number</label>
                                    <input
                                        type="text"
                                        value={transaction.batchNumber}
                                        onChange={(e) =>
                                            setTransaction({
                                                ...transaction,
                                                batchNumber: e.target.value,
                                            })
                                        }
                                        required
                                        className="p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-lg text-gray-700">Time Start</label>
                                    <input
                                        type="time"
                                        value={transaction.timeStart}
                                        onChange={(e) =>
                                            setTransaction({
                                                ...transaction,
                                                timeStart: e.target.value,
                                            })
                                        }
                                        required
                                        className="p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-lg text-gray-700">Time End</label>
                                    <input
                                        type="time"
                                        value={transaction.timeEnd}
                                        onChange={(e) =>
                                            setTransaction({
                                                ...transaction,
                                                timeEnd: e.target.value,
                                            })
                                        }
                                        required
                                        className="p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-lg text-gray-700">Curing Temp. & Pressure</label>
                                    <input
                                        type="text"
                                        value={transaction.curingTemp}
                                        onChange={(e) =>
                                            setTransaction({
                                                ...transaction,
                                                curingTemp: e.target.value,
                                            })
                                        }
                                        required
                                        className="p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="flex flex-col">
                                    <label className="text-lg text-gray-700">Inward Quantity</label>
                                    <input
                                        type="number"
                                        value={transaction.inward}
                                        onChange={(e) =>
                                            setTransaction({
                                                ...transaction,
                                                inward: parseFloat(e.target.value) || 0,
                                            })
                                        }
                                        required
                                        className="p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="flex flex-col">
                                    <label className="text-lg text-gray-700">Outward Quantity</label>
                                    <input
                                        type="number"
                                        value={transaction.outward}
                                        onChange={(e) =>
                                            setTransaction({
                                                ...transaction,
                                                outward: parseFloat(e.target.value) || 0,
                                            })
                                        }
                                        required
                                        className="p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-lg text-gray-700">Rejection qty</label>
                                    <input
                                        type="number"
                                        value={transaction.rejection}
                                        onChange={(e) =>
                                            setTransaction({
                                                ...transaction,
                                                rejection: parseFloat(e.target.value) || 0,
                                            })
                                        }
                                        required
                                        className="p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-lg text-gray-700">REWORK/SCRAP</label>
                                    <input
                                        type="number"
                                        value={transaction.reworkScrap}
                                        onChange={(e) =>
                                            setTransaction({
                                                ...transaction,
                                                reworkScrap: parseFloat(e.target.value) || 0,
                                            })
                                        }
                                        required
                                        className="p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-lg text-gray-700">Machine No.</label>
                                    <input
                                        type="text"
                                        value={transaction.machineNo}
                                        onChange={(e) =>
                                            setTransaction({
                                                ...transaction,
                                                machineNo: e.target.value,
                                            })
                                        }
                                        required
                                        className="p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-lg text-gray-700">Supervised by</label>
                                    <input
                                        type="text"
                                        value={transaction.supervisedBy}
                                        onChange={(e) =>
                                            setTransaction({
                                                ...transaction,
                                                supervisedBy: e.target.value,
                                            })
                                        }
                                        required
                                        className="p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition duration-300"
                            disabled={loading}
                        >
                            {loading ? (
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, loop: Infinity }}>
                                    <FaSpinner className="animate-spin" />
                                </motion.div>
                            ) : (
                                "Log Transaction"
                            )}
                        </button>
                    </form>
                </div>
            )}

           <div className="logs-section mt-12 overflow-scroll">
                <h2 className="text-3xl font-medium text-gray-700 mb-6">Transaction Logs</h2>
                {logs.length > 0 ? (
                    <table className="min-w-full bg-white rounded-lg shadow-lg overflow-scroll">
                    <thead>
                        <tr>
                            <th className="py-3 px-6 text-left">Date</th>
                            <th className="py-3 px-6 text-left">Particulars</th>
                            <th className="py-3 px-6 text-left">Inward</th>
                            <th className="py-3 px-6 text-left">Outward</th>
                            <th className="py-3 px-6 text-left">Balance</th>
                            <th className="py-3 px-6 text-left">Remarks</th>
                            <th className="py-3 px-6 text-left">Shift</th>
                            <th className="py-3 px-6 text-left">Worker</th>
                            <th className="py-3 px-6 text-left">Batch No</th>
                            <th className="py-3 px-6 text-left">Production</th>
                            <th className="py-3 px-6 text-left">Rejection</th>
                            <th className="py-3 px-6 text-left">Machine No</th>
                            <th className="py-3 px-6 text-left">Supervisor</th>
                            <th className="py-3 px-6 text-left">Time Start</th>
                            <th className="py-3 px-6 text-left">Time End</th>
                            <th className="py-3 px-6 text-left">Curing Temp</th>
                            <th className="py-3 px-6 text-left">Rework Scrap</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log, index) => (
                            <tr key={index} className="border-b">
                                <td className="py-4 px-6">{new Date(log.date).toLocaleString()}</td>
                                <td className="py-4 px-6">{log.particulars}</td>
                                <td className="py-4 px-6">{log.inward}</td>
                                <td className="py-4 px-6">{log.outward}</td>
                                <td className="py-4 px-6">{log.balance}</td>
                                <td className="py-4 px-6">{log.remarks || "N/A"}</td>
                                <td className="py-4 px-6">{log.shift}</td>
                                <td className="py-4 px-6">{log.workerName}</td>
                                <td className="py-4 px-6">{log.batchNumber}</td>
                                <td className="py-4 px-6">{log.actualProduction}</td>
                                <td className="py-4 px-6">{log.rejection}</td>
                                <td className="py-4 px-6">{log.machineNo}</td>
                                <td className="py-4 px-6">{log.supervisedBy}</td>
                                <td className="py-4 px-6">{log.timeStart || "N/A"}</td>
                                <td className="py-4 px-6">{log.timeEnd || "N/A"}</td>
                                <td className="py-4 px-6">{log.curingTemp || "N/A"}</td>
                                <td className="py-4 px-6">{log.reworkScrap}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                ) : (
                    <p>No logs available.</p>
                )}
            </div>
        </div>
    );
};

export default ProductInventory;
