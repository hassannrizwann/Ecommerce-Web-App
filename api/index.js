const {vercelHandler}=require('../backend');

module.exports=async function handler(req,res){
  const url=new URL(req.url,'http://localhost');
  const originalPath=url.searchParams.get('__northstar_path');
  if(originalPath){
    url.searchParams.delete('__northstar_path');
    req.url=originalPath+(url.searchParams.size?'?'+url.searchParams.toString():'');
  }
  return vercelHandler(req,res);
};
