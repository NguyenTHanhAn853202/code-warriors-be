import { AppError } from "./AppError";
import { httpCode } from "./httpCode";
import { Judge0Status } from "./judge0Status";
import { URL_JUDGE0 } from "./secret";

interface Itestcase{
    input:string,
    expectedOutput:string
}

interface IResponse{
    point:number,
    time:number,
    memory:number
}

async function runCode(languageId:number,sourceCode:string,testcases:Itestcase[],timeout:number): Promise<IResponse> {
    let evaluate:IResponse = {
        point:0,
        time:0,
        memory:0
    } 
        
        for(let i=0; i<testcases.length; i++){
            const judge0 = await fetch(`${URL_JUDGE0}/submissions?base64_encoded=false&wait=true`,{
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    language_id:languageId,
                    source_code: sourceCode,
                    stdin: testcases[i].input,
                    expected_output:testcases[i].expectedOutput
                })
            })
            const result  = await judge0.json()
            
            if(result.status?.id !== Judge0Status.Accepted){
                
                throw new AppError(result?.stderr || result?.status?.description || result?.error||result?.compile_output|| result?.message|| "Error",httpCode.OK,"warning",{
                    testcase:testcases[i],
                    result:result
                })
            }
            if(result.time*1000 <= timeout){
                evaluate.point++;
            }
            evaluate.time += result.time*1000
            evaluate.memory += result.memory
            
        }

    return evaluate
}

export default runCode;