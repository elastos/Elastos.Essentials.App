count=$*
for i in $(seq ${count}); do
    echo $i
    curl --location --request POST 'http://crc1rpc.longrunweather.com:18080' --header 'Content-Type: application/json' --header 'Content-Type: text/plain' --data-raw '{  "method": "discretemining",  "params": {"count": "1"}}'
    echo
    sleep 5 
done
