#/bin/sh

#ionic cordova run ios --external -l --ssl

for i in "$@"; do
  case $i in
    -t=*|--target=*)
      TARGET="${i#*=}"
      shift # past argument=value
      ;;
    -*|--*)
      echo "Unknown option $i"
      exit 1
      ;;
    *)
      ;;
  esac
done

echo "TARGET  = ${TARGET}"

if [[ -z $TARGET ]]; then
    echo "Please call npm run start-dev-ios -- target=DEVICE_ID"
    echo "To know the available devices, call npm run ios-list-devices"
fi