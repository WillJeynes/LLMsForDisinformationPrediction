export function Home() {
    return (
        <div className="flex justify-center">
            <div className="w-full">
                <div className="m-3 bg-gray-200 rounded-3xl p-3">
                    <h1 className="text-3xl text-center">LLMs for Disinformation Analysis</h1>
                    <h2 className="text-3xl text-center">Dataset Visualizations</h2>
                    <a href="https://jeynes.uk">
                        <h2 className="underline text-center">By Will Jeynes</h2>
                    </a>
                </div>

                <div className="flex flex-wrap justify-between">
                    <div className="m-2 rounded-3xl w-full sm:w-[48%] bg-gray-200 p-10 flex flex-col items-center">
                        <a href="#small">
                            <h3 className="text-2xl text-center underline">Default View</h3>
                        </a>
                        <a href="#small" className="m-5">
                            <img src="small.png" className="border-2 h-64" />
                        </a>
                        <p className="text-center">
                            A filtered collection of the whole dataset, containing only reasonably sized components
                        </p>
                        <p className="text-center">
                            A great introduction to the dataset on a curated set of examples
                        </p>
                    </div>

                    <div className="m-2 rounded-3xl w-full sm:w-[48%] bg-gray-200 p-10 flex flex-col items-center">
                        <a href="#time">
                            <h3 className="text-2xl text-center underline">Time Filtered</h3>
                        </a>
                        <a href="#time" className="m-5">
                            <img src="time.png" className="border-2 h-64" />
                        </a>
                        <p className="text-center">
                            A visualisation showing only the largest component, normally too large to be understandable
                        </p>
                        <p className="text-center">
                            Configurable, scrubber date filter allows migration to be seen over time
                        </p>
                    </div>
                </div>

                <div className="m-3 bg-gray-200 rounded-3xl p-3">
                    <h3 className="text-xl font-semibold">
                        Project Description
                    </h3>
                    <p className="text-lg">
                        Description coming soon
                    </p>

                    <h3 className="text-xl font-semibold mt-3">
                        Sources
                    </h3>

                    <div className="flex flex-wrap">
                            <a
                                href="https://huggingface.co/datasets/WillJeynes/LLMsForDisinformationAnalysis-Dataset"
                                className="block bg-white rounded-xl px-4 py-2 underline text-center w-64 m-1"
                            >
                                Dataset (Hugging Face)
                            </a>

                            <a
                                href="https://github.com/WillJeynes/LLMsForDisinformationAnalysis/"
                                className="block bg-white rounded-xl px-4 py-2 underline text-center w-64 m-1"
                            >
                                Dataset GitHub
                            </a>

                            <a
                                href="https://github.com/WillJeynes/LLMsForDisinformationPrediction/"
                                className="block bg-white rounded-xl px-4 py-2 underline text-center w-64 m-1"
                            >
                                Project Source Code
                            </a>
                    </div>



                </div>
            </div>
        </div>
    );
}